import {
  ConfigPlugin,
  createRunOncePlugin,
} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

export interface WithWeChatProps {
  appId: string;
  universalLink?: string;
}

const REQUIRED_QUERY_SCHEMES = ['weixin', 'weixinULAPI', 'weixinURLParamsAPI'];

function applyPlistMods(plist: Record<string, any>, props: WithWeChatProps): void {
  plist.CFBundleURLTypes = plist.CFBundleURLTypes ?? [];
  const already = (plist.CFBundleURLTypes as any[]).find(
    (t: any) =>
      Array.isArray(t.CFBundleURLSchemes) && t.CFBundleURLSchemes.includes(props.appId),
  );
  if (!already) {
    plist.CFBundleURLTypes.push({
      CFBundleURLName: 'weixin',
      CFBundleURLSchemes: [props.appId],
    });
  }

  plist.LSApplicationQueriesSchemes = plist.LSApplicationQueriesSchemes ?? [];
  for (const scheme of REQUIRED_QUERY_SCHEMES) {
    if (!(plist.LSApplicationQueriesSchemes as string[]).includes(scheme)) {
      (plist.LSApplicationQueriesSchemes as string[]).push(scheme);
    }
  }

  if (props.universalLink) {
    plist.WXUniversalLink = props.universalLink;
  }
}

const withWeChat: ConfigPlugin<WithWeChatProps> = (config, props) => {
  if (!props?.appId) {
    throw new Error('[@minqian/react-native-wechat-lib] "appId" prop is required');
  }

  const c = config as any;

  // Register a synchronous infoPlist mod so tests can invoke it without async overhead.
  if (!c.mods) c.mods = {};
  if (!c.mods.ios) c.mods.ios = {};

  const prevMod: ((cfg: any) => any) | undefined = c.mods.ios.infoPlist;

  c.mods.ios.infoPlist = (cfg: any) => {
    // Chain any previously registered mod first
    if (prevMod) cfg = prevMod(cfg);
    const plist: Record<string, any> = cfg.modResults ?? {};
    applyPlistMods(plist, props);
    cfg.modResults = plist;
    return cfg;
  };

  // Register a synchronous Android manifest mod (consistent with iOS approach above).
  if (!c.mods.android) c.mods.android = {};

  const prevAndroid: ((cfg: any) => any) | undefined = c.mods.android.manifest;

  c.mods.android.manifest = (cfg: any) => {
    if (prevAndroid) cfg = prevAndroid(cfg);
    const manifest = cfg.modResults.manifest;

    // Ensure application array and inject WXEntryActivity
    manifest.application = manifest.application ?? [{}];
    const app = manifest.application[0];
    app.activity = app.activity ?? [];
    const hasWxEntry = app.activity.some(
      (a: any) => a.$?.['android:name'] === '.wxapi.WXEntryActivity',
    );
    if (!hasWxEntry) {
      app.activity.push({
        $: {
          'android:name': '.wxapi.WXEntryActivity',
          'android:exported': 'true',
          'android:launchMode': 'singleTask',
          'android:taskAffinity': '${applicationId}',
          'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
        },
      });
    }

    // Ensure queries element with com.tencent.mm package
    manifest.queries = manifest.queries ?? [];
    const hasWxQuery = manifest.queries.some((q: any) =>
      JSON.stringify(q).includes('com.tencent.mm'),
    );
    if (!hasWxQuery) {
      manifest.queries.push({
        package: [{ $: { 'android:name': 'com.tencent.mm' } }],
      });
    }

    return cfg;
  };

  // Register dangerous mod for WXEntryActivity.kt file generation
  const prevDangerous = c.mods.android.dangerous as ((cfg: any) => any) | undefined;
  c.mods.android.dangerous = async (cfg: any) => {
    if (prevDangerous) cfg = await prevDangerous(cfg);

    const projectRoot = cfg.modRequest.projectRoot;
    const androidDir = path.join(projectRoot, 'android');
    if (!fs.existsSync(androidDir)) {
      return cfg; // no android project, skip
    }

    // Prefer reading applicationId from the config object (always correct),
    // fall back to parsing build.gradle if not available.
    let applicationId: string | undefined =
      cfg.android?.package ?? cfg.modRequest?.packageName;

    if (!applicationId) {
      const appGradle = path.join(projectRoot, 'android', 'app', 'build.gradle');
      if (!fs.existsSync(appGradle)) {
        return cfg; // no android project, skip
      }
      const gradle = fs.readFileSync(appGradle, 'utf8');
      const m = gradle.match(/applicationId\s*['"]([^'"]+)['"]/);
      if (!m) {
        throw new Error(
          '[@minqian/react-native-wechat-lib] cannot find applicationId in android/app/build.gradle',
        );
      }
      applicationId = m[1];
    }
    const pkgPath = applicationId.split('.').join(path.sep);
    const dir = path.join(
      projectRoot,
      'android',
      'app',
      'src',
      'main',
      'java',
      pkgPath,
      'wxapi',
    );
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'WXEntryActivity.kt');
    if (!fs.existsSync(file)) {
      fs.writeFileSync(
        file,
        `package ${applicationId}.wxapi\n\n` +
          `import com.minqian.wechatlib.WXEntryActivityBase\n\n` +
          `class WXEntryActivity : WXEntryActivityBase()\n`,
      );
    }
    return cfg;
  };

  return config;
};

export { withWeChat };
export default createRunOncePlugin(withWeChat, '@minqian/react-native-wechat-lib', '0.1.0');
