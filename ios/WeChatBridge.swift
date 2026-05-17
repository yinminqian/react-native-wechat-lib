import Foundation
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

@MainActor
final class WeChatBridge: NSObject, WXApiDelegate {
  static let shared = WeChatBridge()

  weak var module: ReactNativeWechatLibModule?
  private var registered = false
  private var pendingAuth: CheckedContinuation<[String: Any?], Error>?
  private var pendingShare: CheckedContinuation<[String: Any?], Error>?

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
    let thumbData: Data? = thumb != nil ? try await loadImage(source: thumb!) : nil
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
          let scene = opts["scene"] as? Int else {
      throw WeChatBridgeError.invalidParam("shareMiniProgram requires webpageUrl, userName, scene")
    }
    var hdImage: Data? = nil
    if let d = opts["hdImageData"] as? [String: Any?] {
      hdImage = try await loadImage(source: d)
    }
    return try await awaitShare {
      let obj = WXMiniProgramObject()
      obj.webpageUrl = url
      obj.userName = userName
      obj.path = opts["path"] as? String ?? ""
      if let t = opts["miniProgramType"] as? Int {
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
  func onReq(_ req: BaseReq) {}

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
