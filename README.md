# @minqian/react-native-wechat-lib

微信开放平台 SDK 的 Expo Module 封装：微信登录（OAuth 授权）与分享（文本 / 图片 / 网页 / 小程序）。

- 原生实现为 Swift（iOS）与 Kotlin（Android），基于 Expo Modules API，支持新架构。
- 自带 config plugin，`npx expo prebuild` 即完成全部原生配置，无需手改 `ios/` 与 `android/`。
- 所有调用返回 Promise；授权与分享的结果也可通过事件监听获得。
- 不含微信支付。

依赖版本：iOS `WechatOpenSDK-XCFramework ~> 2.0.9`（iOS 16.4+），Android `wechat-sdk-android 6.8.40`。

## 安装

```sh
npx expo install @minqian/react-native-wechat-lib
```

> 本库包含原生代码，**Expo Go 无法使用**，需要开发构建（`npx expo run:ios|android` 或 `eas build --profile development`）。

## 配置

在 `app.json` / `app.config.ts` 中加入 plugin。`android.package` 与 `ios.bundleIdentifier` 必须与微信开放平台登记的一致。

```ts
{
  expo: {
    android: { package: 'com.example.app' },
    ios: { bundleIdentifier: 'com.example.app' },
    plugins: [
      [
        '@minqian/react-native-wechat-lib',
        {
          appId: 'wx1234567890abcdef',
          // iOS 必需：与微信开放平台登记的 Universal Link 一致，以 / 结尾
          universalLink: 'https://example.com/app/',
        },
      ],
    ],
  },
}
```

plugin 会：

- iOS：写入 `CFBundleURLTypes`（scheme 为 AppID）、`LSApplicationQueriesSchemes`、`WXUniversalLink`，并把 Universal Link 域名加入 Associated Domains。
- Android：声明 `.wxapi.WXEntryActivity`、`<queries>` 中的 `com.tencent.mm`，并在 `<package>/wxapi/` 下生成 `WXEntryActivity.kt`。

Universal Link 需要你在域名下部署 `apple-app-site-association`，plugin 不负责这一步。Android 签名的证书指纹必须与微信开放平台登记的一致。

## 使用

```ts
import * as WeChat from '@minqian/react-native-wechat-lib';

// 首次调用任何接口前注册一次
await WeChat.registerApp('wx1234567890abcdef', 'https://example.com/app/');

if (await WeChat.isWXAppInstalled()) {
  const resp = await WeChat.sendAuthRequest('snsapi_userinfo', 'my-state');
  // resp.errCode === 0 表示成功；-2 用户取消；resp.code 用于后端换取 access_token
}

await WeChat.shareWebpage({
  webpageUrl: 'https://example.com/article/1',
  title: '标题',
  description: '描述',
  thumb: { uri: 'https://example.com/thumb.png' },
  scene: WeChat.WeChatScene.Session, // Session 会话 / Timeline 朋友圈 / Favorite 收藏
});
```

### API

| 函数 | 说明 |
| --- | --- |
| `registerApp(appId, universalLink?)` | 注册 SDK，返回 `Promise<void>` |
| `isWXAppInstalled()` | 是否安装微信 |
| `getApiVersion()` | 微信 SDK 版本 |
| `openWXApp()` | 打开微信 |
| `sendAuthRequest(scope?, state?)` | 拉起授权，返回 `AuthResponse` |
| `shareText({ text, scene? })` | 分享文本 |
| `shareImage({ image, scene? })` | 分享图片，`image` 为 `{ uri }` 或 `{ base64 }` |
| `shareWebpage({ webpageUrl, title?, description?, thumb?, scene? })` | 分享网页 |
| `shareMiniProgram({ webpageUrl, userName, path?, ... })` | 分享小程序（仅会话） |
| `shareVideo({ videoUrl?, videoLowBandUrl?, title?, description?, thumb?, scene? })` | 分享视频链接，两个链接至少填一个 |
| `shareMusicVideo({ title, musicUrl, musicDataUrl, singerName, duration, ... })` | 分享音乐视频，需先向微信申请权限（见下文） |
| `shareFile({ file, fileExtension?, title, description?, thumb?, scene? })` | 分享文件（如 PDF），`file` 为 `{ uri }` 或 `{ base64 }` |
| `launchMiniProgram({ userName, path?, miniProgramType? })` | 拉起小程序，请求发出即返回 |
| `addAuthListener(fn)` / `addShareListener(fn)` | 监听授权 / 分享回调，返回取消函数 |
| `addLaunchMiniProgramListener(fn)` | 小程序跳回 App 时回调，`extMsg` 为小程序按钮的 `app-parameter` |
| `addLaunchFromWXListener(fn)` | 从微信跳回 App 时回调（如音乐视频播放器），带回 `messageExt` / `identification` |

错误以 `WeChatError` 抛出，`code` 为 `NOT_REGISTERED` / `NOT_INSTALLED` / `INVALID_PARAM` / `SEND_FAIL`。

### 限制与说明（来自微信开放平台文档）

- 字段上限：标题 512 字节、描述 1KB、文本 / 链接 10KB（UTF-8），超限时抛出 `INVALID_PARAM`。
- 缩略图上限 32KB、小程序封面 128KB，本库会自动压缩；Android 图片以二进制分享时上限 1MB，超出会压缩。
- 文件：iOS 上限 10MB；Android 以二进制数据分享，不需要 FileProvider。官方示例的场景是会话，其他场景以微信客户端校验为准。
- 音乐视频：需按文档发邮件给微信申请「音乐类型」与「音乐视频类型」分享权限，未开通时微信会拒绝。
- 拉起小程序：已认证的开放平台账号可拉起任意合法小程序；App 未上架时每天最多 100 次。只有小程序通过 `<button open-type="launchApp">` 跳回时才会有 `onLaunchMiniProgramResp` 回调。
- App 未上架时，每个平台每天分享上限 100 次。
- 表情、普通音乐类型不在官方文档内，本库不提供。

## 在宿主应用里优雅降级

原生模块只在开发构建和正式包中存在。宿主可以用 `requireOptionalNativeModule('ReactNativeWechatLib')` 判断模块是否可用，不可用时隐藏微信入口；本库的 JS 入口在 import 阶段不会访问原生对象，在 Expo Go 中引入不会崩溃。

## 开发

```sh
npm install
npm test          # 单元测试（JS 与 config plugin）
npm run build     # 编译 src 与 plugin
npm run lint
```

原生部分需在宿主应用中通过开发构建验证。
