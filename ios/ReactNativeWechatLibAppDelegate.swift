import ExpoModulesCore
import UIKit

#if canImport(WechatOpenSDKDynamic)
import WechatOpenSDKDynamic
#elseif canImport(WechatOpenSDK)
import WechatOpenSDK
#else
import WXApi
#endif

@MainActor
public class ReactNativeWechatLibAppDelegate: ExpoAppDelegateSubscriber {
  public func application(_ app: UIApplication, open url: URL,
                          options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    return WXApi.handleOpen(url, delegate: WeChatBridge.shared)
  }

  public func application(_ application: UIApplication,
                          continue userActivity: NSUserActivity,
                          restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    return WXApi.handleOpenUniversalLink(userActivity, delegate: WeChatBridge.shared)
  }
}
