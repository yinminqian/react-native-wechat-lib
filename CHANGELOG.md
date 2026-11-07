# Changelog

## 0.2.0

- 升级到 Expo SDK 58 / React Native 0.88 工具链（随 `expo-module-template` 58 的工程结构）。
- config plugin 改用 `withInfoPlist` / `withEntitlementsPlist` / `withAndroidManifest` / `withDangerousMod` 标准写法，并自动把 Universal Link 域名加入 Associated Domains。
- JS 改为从 `expo` 引入 `requireNativeModule`，避免宿主与模块各持一份 `expo-modules-core`。
- 微信 SDK 升级：iOS `WechatOpenSDK-XCFramework ~> 2.0.9`，Android `wechat-sdk-android 6.8.40`。
- 删除模板遗留的示例模块文件。

## 0.1.0

- 首个版本：登录、分享（文本 / 图片 / 网页 / 小程序）、事件监听、config plugin。
