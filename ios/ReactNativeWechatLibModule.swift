import ExpoModulesCore

public class ReactNativeWechatLibModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReactNativeWechatLib")

    Events("onAuthResp", "onShareResp")

    OnCreate {
      Task { @MainActor in
        WeChatBridge.shared.module = self
      }
    }
    OnDestroy {
      Task { @MainActor [weak self] in
        if WeChatBridge.shared.module === self {
          WeChatBridge.shared.module = nil
        }
      }
    }

    AsyncFunction("registerApp") { (appId: String, universalLink: String?) async throws in
      try await WeChatBridge.shared.register(appId: appId, universalLink: universalLink)
    }
    AsyncFunction("isWXAppInstalled") { () async -> Bool in
      await MainActor.run { WeChatBridge.shared.isInstalled() }
    }
    AsyncFunction("getApiVersion") { () async -> String in
      await MainActor.run { WeChatBridge.shared.apiVersion() }
    }
    AsyncFunction("openWXApp") { () async -> Bool in
      await MainActor.run { WeChatBridge.shared.openWX() }
    }

    AsyncFunction("sendAuthRequest") { (scope: String, state: String) async throws in
      try await WeChatBridge.shared.sendAuth(scope: scope, state: state)
    }

    AsyncFunction("shareText") { (text: String, scene: Int) async throws in
      try await WeChatBridge.shared.shareText(text, scene: scene)
    }
    AsyncFunction("shareImage") { (image: [String: Any?], scene: Int) async throws in
      try await WeChatBridge.shared.shareImage(image: image, scene: scene)
    }
    AsyncFunction("shareWebpage") { (url: String, title: String?, description: String?, thumb: [String: Any?]?, scene: Int) async throws in
      try await WeChatBridge.shared.shareWebpage(url: url, title: title, description: description, thumb: thumb, scene: scene)
    }
    AsyncFunction("shareMiniProgram") { (opts: [String: Any?]) async throws in
      try await WeChatBridge.shared.shareMiniProgram(opts: opts)
    }
  }

  func emit(event: String, body: [String: Any?]) {
    sendEvent(event, body)
  }
}
