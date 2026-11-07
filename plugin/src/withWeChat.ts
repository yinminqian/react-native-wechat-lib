import {
  type AndroidConfig,
  type ConfigPlugin,
  createRunOncePlugin,
  type InfoPlist,
  withAndroidManifest,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
} from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

export interface WithWeChatProps {
  /** 微信开放平台 AppID，形如 wx1234567890abcdef */
  appId: string;
  /**
   * iOS Universal Link，与微信开放平台登记的一致，须以 / 结尾。
   * 提供后会写入 Info.plist 并把其域名加入 Associated Domains。
   */
  universalLink?: string;
}

const PLUGIN_NAME = '@minqian/react-native-wechat-lib';
const REQUIRED_QUERY_SCHEMES = ['weixin', 'weixinULAPI', 'weixinURLParamsAPI'];
const WECHAT_PACKAGE = 'com.tencent.mm';

/** 纯函数：向 Info.plist 写入 URL scheme、查询白名单与 Universal Link */
export function applyInfoPlist(plist: InfoPlist, props: WithWeChatProps): InfoPlist {
  const urlTypes: NonNullable<InfoPlist['CFBundleURLTypes']> = plist.CFBundleURLTypes ?? [];
  const hasScheme = urlTypes.some((type) => type.CFBundleURLSchemes.includes(props.appId));
  if (!hasScheme) {
    urlTypes.push({ CFBundleURLName: 'weixin', CFBundleURLSchemes: [props.appId] });
  }
  plist.CFBundleURLTypes = urlTypes;

  const querySchemes = new Set((plist.LSApplicationQueriesSchemes ?? []) as string[]);
  REQUIRED_QUERY_SCHEMES.forEach((scheme) => querySchemes.add(scheme));
  plist.LSApplicationQueriesSchemes = [...querySchemes];

  if (props.universalLink) {
    plist.WXUniversalLink = props.universalLink;
  }
  return plist;
}

/** 纯函数：把 Universal Link 的域名加入 Associated Domains */
export function applyEntitlements<T extends Record<string, unknown>>(
  entitlements: T,
  props: WithWeChatProps,
): T {
  if (!props.universalLink) return entitlements;
  const host = new URL(props.universalLink).host;
  const key = 'com.apple.developer.associated-domains';
  const domains = new Set((entitlements[key] as string[] | undefined) ?? []);
  domains.add(`applinks:${host}`);
  (entitlements as Record<string, unknown>)[key] = [...domains];
  return entitlements;
}

type Manifest = AndroidConfig.Manifest.AndroidManifest;

/** 纯函数：注入微信回调 Activity 与 Android 11+ 的包可见性声明 */
export function applyAndroidManifest(manifest: Manifest): Manifest {
  const application = manifest.manifest.application?.[0];
  if (!application) {
    throw new Error(`[${PLUGIN_NAME}] AndroidManifest.xml has no <application> element`);
  }

  application.activity = application.activity ?? [];
  const hasEntry = application.activity.some(
    (activity) => activity.$['android:name'] === '.wxapi.WXEntryActivity',
  );
  if (!hasEntry) {
    application.activity.push({
      $: {
        'android:name': '.wxapi.WXEntryActivity',
        'android:exported': 'true',
        'android:launchMode': 'singleTask',
        'android:taskAffinity': '${applicationId}',
        'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
      },
    });
  }

  const queries = (manifest.manifest.queries ?? []) as { package?: { $: { 'android:name': string } }[] }[];
  const hasQuery = queries.some((query) =>
    query.package?.some((pkg) => pkg.$['android:name'] === WECHAT_PACKAGE),
  );
  if (!hasQuery) {
    queries.push({ package: [{ $: { 'android:name': WECHAT_PACKAGE } }] });
  }
  manifest.manifest.queries = queries as Manifest['manifest']['queries'];
  return manifest;
}

/** 生成 WXEntryActivity.kt 的源码：微信要求回调 Activity 位于 <applicationId>.wxapi 包下 */
export function wxEntryActivitySource(applicationId: string): string {
  return (
    `package ${applicationId}.wxapi\n\n` +
    `import com.minqian.wechatlib.WXEntryActivityBase\n\n` +
    `class WXEntryActivity : WXEntryActivityBase()\n`
  );
}

const withWeChatIos: ConfigPlugin<WithWeChatProps> = (config, props) => {
  config = withInfoPlist(config, (c) => {
    c.modResults = applyInfoPlist(c.modResults, props);
    return c;
  });
  if (props.universalLink) {
    config = withEntitlementsPlist(config, (c) => {
      c.modResults = applyEntitlements(c.modResults, props);
      return c;
    });
  }
  return config;
};

const withWeChatAndroid: ConfigPlugin<WithWeChatProps> = (config) => {
  config = withAndroidManifest(config, (c) => {
    c.modResults = applyAndroidManifest(c.modResults);
    return c;
  });
  // 回调 Activity 必须是宿主包名下的类，SDK 无法预置，因此在 prebuild 时生成源文件
  config = withDangerousMod(config, [
    'android',
    (c) => {
      const applicationId = c.android?.package;
      if (!applicationId) {
        throw new Error(`[${PLUGIN_NAME}] "android.package" must be set in the app config`);
      }
      const dir = path.join(
        c.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        ...applicationId.split('.'),
        'wxapi',
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'WXEntryActivity.kt'), wxEntryActivitySource(applicationId));
      return c;
    },
  ]);
  return config;
};

const withWeChat: ConfigPlugin<WithWeChatProps> = (config, props) => {
  if (!props?.appId) {
    throw new Error(`[${PLUGIN_NAME}] "appId" is required`);
  }
  if (props.universalLink && !/^https:\/\/[^/?#]+\/.*\/$/.test(props.universalLink)) {
    throw new Error(`[${PLUGIN_NAME}] "universalLink" must be an https URL ending with "/"`);
  }
  config = withWeChatIos(config, props);
  config = withWeChatAndroid(config, props);
  return config;
};

export default createRunOncePlugin(withWeChat, PLUGIN_NAME);
