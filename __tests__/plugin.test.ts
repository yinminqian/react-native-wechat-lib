import {
  applyAndroidManifest,
  applyEntitlements,
  applyInfoPlist,
  wxEntryActivitySource,
} from '../plugin/src/withWeChat';

const props = { appId: 'wxTEST', universalLink: 'https://example.com/wx/' };

describe('applyInfoPlist', () => {
  it('injects URL scheme, query schemes and universal link', () => {
    const plist = applyInfoPlist({}, props);
    expect(plist.CFBundleURLTypes).toEqual([{ CFBundleURLName: 'weixin', CFBundleURLSchemes: ['wxTEST'] }]);
    expect(plist.LSApplicationQueriesSchemes).toEqual(['weixin', 'weixinULAPI', 'weixinURLParamsAPI']);
    expect(plist.WXUniversalLink).toBe('https://example.com/wx/');
  });

  it('is idempotent and keeps existing entries', () => {
    const once = applyInfoPlist(
      { CFBundleURLTypes: [{ CFBundleURLSchemes: ['myapp'] }], LSApplicationQueriesSchemes: ['weixin'] },
      props,
    );
    const twice = applyInfoPlist(once, props);
    expect(twice.CFBundleURLTypes).toHaveLength(2);
    expect(twice.LSApplicationQueriesSchemes).toHaveLength(3);
  });

  it('skips universal link when not provided', () => {
    const plist = applyInfoPlist({}, { appId: 'wxTEST' });
    expect(plist.WXUniversalLink).toBeUndefined();
  });
});

describe('applyEntitlements', () => {
  it('adds applinks for the universal link host', () => {
    const entitlements = applyEntitlements<Record<string, unknown>>({}, props);
    expect(entitlements['com.apple.developer.associated-domains']).toEqual(['applinks:example.com']);
  });

  it('does not duplicate an existing domain', () => {
    const entitlements = applyEntitlements(
      { 'com.apple.developer.associated-domains': ['applinks:example.com', 'applinks:other.com'] },
      props,
    );
    expect(entitlements['com.apple.developer.associated-domains']).toEqual([
      'applinks:example.com',
      'applinks:other.com',
    ]);
  });

  it('leaves entitlements untouched without a universal link', () => {
    expect(applyEntitlements<Record<string, unknown>>({}, { appId: 'wxTEST' })).toEqual({});
  });
});

describe('applyAndroidManifest', () => {
  const manifest = () => ({ manifest: { $: {}, application: [{ $: { 'android:name': '.MainApplication' } }] } });

  it('injects WXEntryActivity and the WeChat package query', () => {
    const out = applyAndroidManifest(manifest() as any);
    const activities = out.manifest.application?.[0]?.activity ?? [];
    expect(activities).toHaveLength(1);
    expect(activities[0]?.$['android:name']).toBe('.wxapi.WXEntryActivity');
    expect(activities[0]?.$['android:exported']).toBe('true');
    expect(JSON.stringify(out.manifest.queries)).toContain('com.tencent.mm');
  });

  it('is idempotent', () => {
    const out = applyAndroidManifest(applyAndroidManifest(manifest() as any));
    expect(out.manifest.application?.[0]?.activity).toHaveLength(1);
    expect(out.manifest.queries).toHaveLength(1);
  });

  it('throws without an application element', () => {
    expect(() => applyAndroidManifest({ manifest: { $: {} } } as any)).toThrow(/application/);
  });
});

describe('wxEntryActivitySource', () => {
  it('places the activity under <applicationId>.wxapi', () => {
    const source = wxEntryActivitySource('com.example.app');
    expect(source).toContain('package com.example.app.wxapi');
    expect(source).toContain('class WXEntryActivity : WXEntryActivityBase()');
  });
});
