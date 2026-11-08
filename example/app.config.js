/**
 * 在真机上用自己的微信开放平台应用测试时，通过环境变量覆盖身份信息（不写进仓库）：
 *
 *   EXAMPLE_WECHAT_APP_ID         微信开放平台移动应用的 AppID
 *   EXAMPLE_WECHAT_UNIVERSAL_LINK  iOS Universal Link（https 开头、/ 结尾）
 *   EXAMPLE_ANDROID_PACKAGE       开放平台登记的 Android 包名
 *   EXAMPLE_ANDROID_VERSION_CODE  覆盖安装同包名的应用时使用
 *   EXAMPLE_IOS_BUNDLE_ID         开放平台登记的 iOS Bundle ID
 *
 * 微信会校验包名 / Bundle ID、签名与 AppID 是否一致；Android 正式签名通过 gradle 的
 * android.injected.signing.* 参数在打包时传入。AppID 同时以 EXPO_PUBLIC_WECHAT_APP_ID 注入 JS 作为默认值。
 */
module.exports = ({ config }) => {
  const env = process.env;
  const appId = env.EXAMPLE_WECHAT_APP_ID;
  const universalLink = env.EXAMPLE_WECHAT_UNIVERSAL_LINK;

  const plugins = (config.plugins ?? []).map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== '../app.plugin.js') return plugin;
    return [
      plugin[0],
      {
        ...plugin[1],
        ...(appId ? { appId } : null),
        ...(universalLink ? { universalLink } : null),
      },
    ];
  });

  return {
    ...config,
    plugins,
    android: {
      ...config.android,
      ...(env.EXAMPLE_ANDROID_PACKAGE ? { package: env.EXAMPLE_ANDROID_PACKAGE } : null),
      ...(env.EXAMPLE_ANDROID_VERSION_CODE ? { versionCode: Number(env.EXAMPLE_ANDROID_VERSION_CODE) } : null),
    },
    ios: {
      ...config.ios,
      ...(env.EXAMPLE_IOS_BUNDLE_ID ? { bundleIdentifier: env.EXAMPLE_IOS_BUNDLE_ID } : null),
    },
  };
};
