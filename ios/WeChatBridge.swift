import Foundation
import UIKit
import ExpoModulesCore

#if canImport(WechatOpenSDKDynamic)
import WechatOpenSDKDynamic
#elseif canImport(WechatOpenSDK)
import WechatOpenSDK
#else
import WXApi
#endif

enum WeChatBridgeError: Error {
  case notRegistered
  case sendFailed(String)
  case invalidParam(String)
}

// 传给 JS 的错误信息取自 localizedDescription；不提供时只会显示 "WeChatBridgeError error 2" 这类看不出原因的文字
extension WeChatBridgeError: LocalizedError {
  var errorDescription: String? {
    switch self {
    case .notRegistered: return "NOT_REGISTERED: call registerApp first"
    case .sendFailed(let reason): return "SEND_FAIL: \(reason)"
    case .invalidParam(let reason): return "INVALID_PARAM: \(reason)"
    }
  }
}

@MainActor
final class WeChatBridge: NSObject, WXApiDelegate {
  static let shared = WeChatBridge()

  weak var module: ReactNativeWechatLibModule?
  private var registered = false
  private var pendingAuth: CheckedContinuation<[String: Any?], Error>?
  private var pendingShare: CheckedContinuation<[String: Any?], Error>?
  /// 从微信跳回 App 的请求：JS 还没开始监听时（如被微信冷启动）先存着，开始监听后补发
  private var pendingLaunchFromWX: [String: Any?]?

  /// 微信开放平台文档规定的大小上限
  static let thumbMaxBytes = 32 * 1024          // WXMediaMessage.thumbData
  static let miniProgramImageMaxBytes = 128 * 1024 // WXMiniProgramObject.hdImageData
  static let fileMaxBytes = 10 * 1024 * 1024    // WXFileObject.fileData（iOS）

  func register(appId: String, universalLink: String?) async throws {
    let ul = universalLink ?? ""
    // WXApi.registerApp can return false on simulators even when the SDK is
    // functional (e.g. universal-link not resolvable in the sandbox).  We
    // still mark the bridge as "registered" so that version / install checks
    // work; actual send operations will fail gracefully if WeChat isn't present.
    _ = WXApi.registerApp(appId, universalLink: ul)
    registered = true
  }

  func ensureRegistered() throws {
    if !registered { throw WeChatBridgeError.notRegistered }
  }

  func isInstalled() -> Bool { WXApi.isWXAppInstalled() }
  func apiVersion() -> String { WXApi.getVersion() }
  func openWX() -> Bool { WXApi.openWXApp() }

  func sendAuth(scope: String, state: String) async throws -> [String: Any?] {
    try ensureRegistered()
    pendingAuth?.resume(throwing: WeChatBridgeError.sendFailed("superseded"))
    return try await withCheckedThrowingContinuation { (cont: CheckedContinuation<[String: Any?], Error>) in
      pendingAuth = cont
      let req = SendAuthReq()
      req.scope = scope
      req.state = state
      WXApi.send(req) { ok in
        if !ok {
          self.pendingAuth?.resume(throwing: WeChatBridgeError.sendFailed("WXApi.send returned false"))
          self.pendingAuth = nil
        }
      }
    }
  }

  func shareText(_ text: String, scene: Int) async throws -> [String: Any?] {
    try await awaitShare {
      let req = SendMessageToWXReq()
      req.bText = true
      req.text = text
      req.scene = Int32(scene)
      WXApi.send(req)
    }
  }

  func shareImage(image: [String: Any?], scene: Int) async throws -> [String: Any?] {
    let data = try await loadImage(source: image)
    return try await awaitShare {
      let obj = WXImageObject()
      obj.imageData = data
      let msg = WXMediaMessage()
      msg.mediaObject = obj
      let req = SendMessageToWXReq()
      req.bText = false
      req.message = msg
      req.scene = Int32(scene)
      WXApi.send(req)
    }
  }

  func shareWebpage(url: String, title: String?, description: String?, thumb: [String: Any?]?, scene: Int) async throws -> [String: Any?] {
    let thumbData = try await loadThumb(thumb)
    return try await awaitShare {
      let obj = WXWebpageObject()
      obj.webpageUrl = url
      let msg = WXMediaMessage()
      msg.title = title ?? ""
      msg.description = description ?? ""
      msg.mediaObject = obj
      if let d = thumbData { msg.thumbData = d }
      let req = SendMessageToWXReq()
      req.bText = false
      req.message = msg
      req.scene = Int32(scene)
      WXApi.send(req)
    }
  }

  func shareMiniProgram(opts: [String: Any?]) async throws -> [String: Any?] {
    guard let url = opts["webpageUrl"] as? String,
          let userName = opts["userName"] as? String,
          let scene = intValue(opts["scene"]) else {
      throw WeChatBridgeError.invalidParam("shareMiniProgram requires webpageUrl, userName, scene")
    }
    var hdImage: Data? = nil
    if let d = opts["hdImageData"] as? [String: Any?] {
      hdImage = compressImage(try await loadImage(source: d), maxBytes: Self.miniProgramImageMaxBytes)
    }
    return try await awaitShare {
      let obj = WXMiniProgramObject()
      obj.webpageUrl = url
      obj.userName = userName
      obj.path = opts["path"] as? String ?? ""
      if let t = intValue(opts["miniProgramType"]) {
        obj.miniProgramType = WXMiniProgramType(rawValue: UInt(t)) ?? .release
      }
      obj.withShareTicket = (opts["withShareTicket"] as? Bool) ?? false
      if let d = hdImage { obj.hdImageData = d }
      let msg = WXMediaMessage()
      msg.title = opts["title"] as? String ?? ""
      msg.description = opts["description"] as? String ?? ""
      msg.mediaObject = obj
      let req = SendMessageToWXReq()
      req.bText = false
      req.message = msg
      req.scene = Int32(scene)
      WXApi.send(req)
    }
  }

  func launchMiniProgram(userName: String, path: String?, type: Int) async throws {
    try ensureRegistered()
    let req = WXLaunchMiniProgramReq()
    req.userName = userName
    // 没传路径时保持 SDK 默认值（打开首页），不覆盖
    if let path { req.path = path }
    req.miniProgramType = WXMiniProgramType(rawValue: UInt(type)) ?? .release
    let ok = await withCheckedContinuation { (cont: CheckedContinuation<Bool, Never>) in
      WXApi.send(req) { cont.resume(returning: $0) }
    }
    if !ok { throw WeChatBridgeError.sendFailed("WXApi.send returned false") }
  }

  func shareVideo(videoUrl: String?, lowBandUrl: String?, title: String?, description: String?,
                  thumb: [String: Any?]?, scene: Int) async throws -> [String: Any?] {
    let thumbData = try await loadThumb(thumb)
    return try await awaitShare {
      let obj = WXVideoObject()
      if let v = videoUrl { obj.videoUrl = v }
      if let v = lowBandUrl { obj.videoLowBandUrl = v }
      let msg = WXMediaMessage()
      msg.title = title ?? ""
      msg.description = description ?? ""
      msg.mediaObject = obj
      if let d = thumbData { msg.thumbData = d }
      let req = SendMessageToWXReq()
      req.bText = false
      req.message = msg
      req.scene = Int32(scene)
      WXApi.send(req)
    }
  }

  func shareMusicVideo(opts: [String: Any?]) async throws -> [String: Any?] {
    guard let title = opts["title"] as? String,
          let musicUrl = opts["musicUrl"] as? String,
          let musicDataUrl = opts["musicDataUrl"] as? String,
          let singerName = opts["singerName"] as? String,
          let duration = intValue(opts["duration"]),
          let scene = intValue(opts["scene"]) else {
      throw WeChatBridgeError.invalidParam("shareMusicVideo requires title, musicUrl, musicDataUrl, singerName, duration, scene")
    }
    let thumbData = try await loadThumb(opts["thumb"] as? [String: Any?])
    return try await awaitShare {
      let obj = WXMusicVideoObject()
      obj.musicUrl = musicUrl
      obj.musicDataUrl = musicDataUrl
      obj.singerName = singerName
      obj.duration = UInt32(duration)
      if let v = opts["songLyric"] as? String { obj.songLyric = v }
      if let v = opts["albumName"] as? String { obj.albumName = v }
      if let v = opts["musicGenre"] as? String { obj.musicGenre = v }
      if let v = intValue(opts["issueDate"]) { obj.issueDate = UInt64(v) }
      if let v = opts["identification"] as? String { obj.identification = v }
      let msg = WXMediaMessage()
      msg.title = title
      msg.description = opts["description"] as? String ?? ""
      msg.messageExt = opts["messageExt"] as? String
      msg.mediaObject = obj
      if let d = thumbData { msg.thumbData = d }
      let req = SendMessageToWXReq()
      req.bText = false
      req.message = msg
      req.scene = Int32(scene)
      WXApi.send(req)
    }
  }

  func shareFile(file: [String: Any?], fileExtension: String, title: String, description: String?,
                 thumb: [String: Any?]?, scene: Int) async throws -> [String: Any?] {
    let data = try await loadImage(source: file)
    if data.count > Self.fileMaxBytes {
      throw WeChatBridgeError.invalidParam("file exceeds 10MB (WeChat iOS limit)")
    }
    let thumbData = try await loadThumb(thumb)
    return try await awaitShare {
      let obj = WXFileObject()
      obj.fileExtension = fileExtension
      obj.fileData = data
      let msg = WXMediaMessage()
      msg.title = title
      msg.description = description ?? ""
      msg.mediaObject = obj
      if let d = thumbData { msg.thumbData = d }
      let req = SendMessageToWXReq()
      req.bText = false
      req.message = msg
      req.scene = Int32(scene)
      WXApi.send(req)
    }
  }

  /// JS 开始监听 onLaunchFromWX 时补发缓存的跳回请求
  func flushPendingLaunchFromWX() {
    guard let payload = pendingLaunchFromWX, let module else { return }
    pendingLaunchFromWX = nil
    module.emit(event: "onLaunchFromWX", body: payload)
  }

  /// JS 传进字典的数字在原生侧可能是 Int、Double 或 NSNumber，统一取整数
  private func intValue(_ value: Any??) -> Int? {
    guard let unwrapped = value, let v = unwrapped else { return nil }
    if let i = v as? Int { return i }
    if let d = v as? Double { return Int(d) }
    if let n = v as? NSNumber { return n.intValue }
    return nil
  }

  /// 缩略图：读取后压到微信要求的 32KB 以内
  private func loadThumb(_ source: [String: Any?]?) async throws -> Data? {
    guard let source else { return nil }
    return compressImage(try await loadImage(source: source), maxBytes: Self.thumbMaxBytes)
  }

  /// 依次降低 JPEG 质量、缩小尺寸，直到不超过 maxBytes；本来就不超过或不是图片时原样返回
  private func compressImage(_ data: Data, maxBytes: Int) -> Data {
    if data.count <= maxBytes { return data }
    guard var image = UIImage(data: data) else { return data }
    var best = data
    for _ in 0..<8 {
      for quality in stride(from: 0.8, through: 0.2, by: -0.2) {
        if let jpeg = image.jpegData(compressionQuality: CGFloat(quality)) {
          if jpeg.count <= maxBytes { return jpeg }
          if jpeg.count < best.count { best = jpeg }
        }
      }
      let size = CGSize(width: image.size.width * 0.7, height: image.size.height * 0.7)
      if size.width < 16 || size.height < 16 { break }
      let renderer = UIGraphicsImageRenderer(size: size)
      image = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
    }
    return best
  }

  private func loadImage(source: [String: Any?]) async throws -> Data {
    if let base64 = source["base64"] as? String, let d = Data(base64Encoded: base64) {
      return d
    }
    if let uri = source["uri"] as? String, let url = URL(string: uri) {
      if url.isFileURL { return try Data(contentsOf: url) }
      let (data, _) = try await URLSession.shared.data(from: url)
      return data
    }
    throw WeChatBridgeError.invalidParam("image source missing uri/base64")
  }

  // MARK: - WXApiDelegate
  func onReq(_ req: BaseReq) {
    // 从微信跳回（如音乐视频播放器里的跳转入口）：带回分享时写入的 messageExt / identification
    guard let launch = req as? LaunchFromWXReq else { return }
    let message = launch.message
    let payload: [String: Any?] = [
      "messageExt": message.messageExt,
      "identification": (message.mediaObject as? WXMusicVideoObject)?.identification,
      "lang": launch.lang,
      "country": launch.country,
    ]
    if let module {
      module.emit(event: "onLaunchFromWX", body: payload)
    } else {
      pendingLaunchFromWX = payload
    }
  }

  func onResp(_ resp: BaseResp) {
    if let auth = resp as? SendAuthResp {
      let payload: [String: Any?] = [
        "errCode": Int(auth.errCode),
        "errStr": auth.errStr,
        "code": auth.code,
        "state": auth.state,
        "lang": auth.lang,
        "country": auth.country,
      ]
      module?.emit(event: "onAuthResp", body: payload)
      pendingAuth?.resume(returning: payload)
      pendingAuth = nil
      return
    }
    if let launch = resp as? WXLaunchMiniProgramResp {
      module?.emit(event: "onLaunchMiniProgramResp", body: [
        "errCode": Int(launch.errCode),
        "errStr": launch.errStr,
        "extMsg": launch.extMsg,
      ])
      return
    }
    if resp is SendMessageToWXResp {
      let payload: [String: Any?] = [
        "errCode": Int(resp.errCode),
        "errStr": resp.errStr,
        "type": Int(resp.type),
      ]
      module?.emit(event: "onShareResp", body: payload)
      pendingShare?.resume(returning: payload)
      pendingShare = nil
      return
    }
  }

  // Called by share-method implementations (Task 15)
  func awaitShare<T>(_ run: () -> T) async throws -> [String: Any?] {
    try ensureRegistered()
    pendingShare?.resume(throwing: WeChatBridgeError.sendFailed("superseded"))
    return try await withCheckedThrowingContinuation { cont in
      pendingShare = cont
      _ = run()
    }
  }
}
