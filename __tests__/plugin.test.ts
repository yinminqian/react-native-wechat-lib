import withWeChat from '../plugin/src/withWeChat';

function applyIOSPlistMod(config: any) {
  const ios = config.mods?.ios?.infoPlist;
  if (!ios) return config;
  return ios({ ...config, modResults: { ...(config.ios?.infoPlist ?? {}) } });
}

describe('withWeChat — iOS Info.plist', () => {
  it('throws when appId is missing', () => {
    expect(() => (withWeChat as any)({}, {})).toThrow(/appId/);
  });

  it('injects CFBundleURLSchemes, query schemes, universal link', () => {
    let config: any = { ios: { infoPlist: {} }, name: 'x', slug: 'x' };
    config = (withWeChat as any)(config, {
      appId: 'wxTEST',
      universalLink: 'https://example.com/wx/',
    });
    const out = applyIOSPlistMod(config);
    expect(out.modResults.CFBundleURLTypes[0].CFBundleURLSchemes).toContain('wxTEST');
    expect(out.modResults.LSApplicationQueriesSchemes).toEqual(
      expect.arrayContaining(['weixin', 'weixinULAPI', 'weixinURLParamsAPI']),
    );
    expect(out.modResults.WXUniversalLink).toBe('https://example.com/wx/');
  });

  it('is idempotent over multiple runs', () => {
    let config: any = { ios: { infoPlist: {} }, name: 'x', slug: 'x' };
    config = (withWeChat as any)(config, { appId: 'wxTEST' });
    config = (withWeChat as any)(config, { appId: 'wxTEST' });
    const out = applyIOSPlistMod(config);
    expect(out.modResults.CFBundleURLTypes.length).toBe(1);
    expect(out.modResults.LSApplicationQueriesSchemes.length).toBe(3);
  });
});

function applyAndroidManifestMod(config: any) {
  const mod = config.mods?.android?.manifest;
  if (!mod) return config;
  return mod({
    ...config,
    modResults: emptyManifest(),
  });
}

function emptyManifest() {
  return {
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android', package: 'com.example.app' },
      'uses-permission': [],
      queries: [],
      application: [{ $: { 'android:name': '.MainApplication' }, activity: [] }],
    },
  };
}

describe('withWeChat — AndroidManifest', () => {
  it('adds WXEntryActivity into application', () => {
    let config: any = { android: {}, ios: { infoPlist: {} }, name: 'x', slug: 'x' };
    config = (withWeChat as any)(config, { appId: 'wxTEST' });
    const out = applyAndroidManifestMod(config);
    const activities = out.modResults.manifest.application[0].activity;
    const wx = activities.find((a: any) => a.$['android:name'] === '.wxapi.WXEntryActivity');
    expect(wx).toBeDefined();
    expect(wx.$['android:exported']).toBe('true');
    expect(wx.$['android:launchMode']).toBe('singleTask');
  });

  it('adds <queries><package> for com.tencent.mm', () => {
    let config: any = { android: {}, ios: { infoPlist: {} }, name: 'x', slug: 'x' };
    config = (withWeChat as any)(config, { appId: 'wxTEST' });
    const out = applyAndroidManifestMod(config);
    const queries = out.modResults.manifest.queries;
    expect(JSON.stringify(queries)).toContain('com.tencent.mm');
  });
});

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function makeTempProject(applicationId = 'com.example.app') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wxlib-'));
  const appGradle = path.join(dir, 'android', 'app');
  fs.mkdirSync(appGradle, { recursive: true });
  fs.writeFileSync(
    path.join(appGradle, 'build.gradle'),
    `android { defaultConfig { applicationId "${applicationId}" } }`,
  );
  return dir;
}

function applyAndroidDangerousMod(config: any, projectRoot: string) {
  const mod = config.mods?.android?.dangerous;
  if (!mod) return config;
  return mod({
    ...config,
    modRequest: { projectRoot, platformProjectRoot: path.join(projectRoot, 'android') },
    modResults: {},
  });
}

describe('withWeChat — WXEntryActivity.kt generation', () => {
  it('generates a stub at <applicationId>/wxapi/WXEntryActivity.kt', async () => {
    const projectRoot = makeTempProject('com.minqian.example');
    let config: any = { android: {}, ios: { infoPlist: {} }, name: 'x', slug: 'x' };
    config = (withWeChat as any)(config, { appId: 'wxTEST' });
    await applyAndroidDangerousMod(config, projectRoot);

    const expectedPath = path.join(
      projectRoot, 'android', 'app', 'src', 'main', 'java',
      'com', 'minqian', 'example', 'wxapi', 'WXEntryActivity.kt',
    );
    expect(fs.existsSync(expectedPath)).toBe(true);
    const content = fs.readFileSync(expectedPath, 'utf8');
    expect(content).toContain('package com.minqian.example.wxapi');
    expect(content).toContain('WXEntryActivityBase');
  });
});
