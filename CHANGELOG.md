# Changelog

## 0.3.0

按微信开放平台文档（分享与收藏、APP 拉起小程序，2026-07 版）补齐接口：

- 新增 `launchMiniProgram`：拉起小程序；小程序通过 `<button open-type="launchApp">` 跳回时，`app-parameter` 经 `addLaunchMiniProgramListener` 回调。
- 新增 `shareVideo`：分享视频链接。
- 新增 `shareMusicVideo`：分享音乐视频（需向微信申请音乐 / 音乐视频分享权限）。
- 新增 `shareFile`：以二进制数据分享文件（如 PDF），iOS 上限 10MB。
- 新增 `addLaunchFromWXListener`：从微信跳回 App 时带回分享时写入的 `messageExt` / `identification`；App 被微信冷启动时在开始监听后补发。Android 跳回时把 App 带到前台。
- 按文档的字段长度上限做参数校验（标题 512 字节、描述 1KB、文本 / 链接 10KB 等），超限时抛出 `INVALID_PARAM`。
- 修复：iOS 缩略图未压缩（文档上限 32KB）；小程序封面压到 128KB 以内；Android 图片二进制超过 1MB 时压缩。
- 修复：`shareMiniProgram` 的 `scene` / `miniProgramType` 在原生侧可能被当作浮点数解析失败。
- 表情与普通音乐类型不在官方文档内，未提供。

## 0.2.0

- 升级到 Expo SDK 58 / React Native 0.88 工具链（随 `expo-module-template` 58 的工程结构）。
- config plugin 改用 `withInfoPlist` / `withEntitlementsPlist` / `withAndroidManifest` / `withDangerousMod` 标准写法，并自动把 Universal Link 域名加入 Associated Domains。
- JS 改为从 `expo` 引入 `requireNativeModule`，避免宿主与模块各持一份 `expo-modules-core`。
- 微信 SDK 升级：iOS `WechatOpenSDK-XCFramework ~> 2.0.9`，Android `wechat-sdk-android 6.8.40`。
- 删除模板遗留的示例模块文件。

## 0.1.0

- 首个版本：登录、分享（文本 / 图片 / 网页 / 小程序）、事件监听、config plugin。
