import { WeChatError } from '../src/types';

const nativeMock = {
  registerApp: jest.fn(),
  isWXAppInstalled: jest.fn(),
  getApiVersion: jest.fn(),
  openWXApp: jest.fn(),
  sendAuthRequest: jest.fn(),
  shareText: jest.fn(),
  shareImage: jest.fn(),
  shareWebpage: jest.fn(),
  shareMiniProgram: jest.fn(),
};

jest.mock('../src/NativeWeChatModule', () => ({
  __esModule: true,
  default: nativeMock,
}));

import {
  registerApp,
  isWXAppInstalled,
  getApiVersion,
  openWXApp,
  sendAuthRequest,
  shareText,
  shareImage,
  shareWebpage,
  shareMiniProgram,
  WeChatScene,
  WeChatMiniProgramType,
} from '../src/index';

beforeEach(() => {
  Object.values(nativeMock).forEach((fn) => fn.mockReset());
});

describe('registerApp', () => {
  it('forwards appId + universalLink to native', async () => {
    nativeMock.registerApp.mockResolvedValue(undefined);
    await registerApp('wx123', 'https://example.com/wx/');
    expect(nativeMock.registerApp).toHaveBeenCalledWith('wx123', 'https://example.com/wx/');
  });

  it('passes null universalLink when omitted', async () => {
    nativeMock.registerApp.mockResolvedValue(undefined);
    await registerApp('wx123');
    expect(nativeMock.registerApp).toHaveBeenCalledWith('wx123', null);
  });

  it('wraps native error as WeChatError', async () => {
    nativeMock.registerApp.mockRejectedValue(new Error('boom'));
    await expect(registerApp('wx123')).rejects.toBeInstanceOf(WeChatError);
  });
});

describe('isWXAppInstalled', () => {
  it('returns native result', async () => {
    nativeMock.isWXAppInstalled.mockResolvedValue(true);
    await expect(isWXAppInstalled()).resolves.toBe(true);
  });
});

describe('getApiVersion', () => {
  it('returns native result', async () => {
    nativeMock.getApiVersion.mockResolvedValue('1.9.5');
    await expect(getApiVersion()).resolves.toBe('1.9.5');
  });
});

describe('openWXApp', () => {
  it('returns native result', async () => {
    nativeMock.openWXApp.mockResolvedValue(true);
    await expect(openWXApp()).resolves.toBe(true);
  });
});

describe('sendAuthRequest', () => {
  it('defaults scope to snsapi_userinfo and generates non-empty state', async () => {
    nativeMock.sendAuthRequest.mockResolvedValue({ errCode: 0, code: 'abc' });
    await sendAuthRequest();
    const [scope, state] = nativeMock.sendAuthRequest.mock.calls[0];
    expect(scope).toBe('snsapi_userinfo');
    expect(typeof state).toBe('string');
    expect(state.length).toBeGreaterThan(0);
  });

  it('forwards explicit scope + state', async () => {
    nativeMock.sendAuthRequest.mockResolvedValue({ errCode: 0, code: 'def' });
    await sendAuthRequest('snsapi_login', 'xyz');
    expect(nativeMock.sendAuthRequest).toHaveBeenCalledWith('snsapi_login', 'xyz');
  });

  it('returns parsed AuthResponse', async () => {
    nativeMock.sendAuthRequest.mockResolvedValue({
      errCode: 0,
      code: 'auth-code-1',
      state: 'state-1',
      lang: 'zh_CN',
      country: 'CN',
    });
    const res = await sendAuthRequest('snsapi_userinfo', 'state-1');
    expect(res).toEqual({
      errCode: 0,
      code: 'auth-code-1',
      state: 'state-1',
      lang: 'zh_CN',
      country: 'CN',
    });
  });
});

describe('shareText', () => {
  it('rejects empty text with INVALID_PARAM', async () => {
    await expect(shareText({ text: '' })).rejects.toMatchObject({
      code: 'INVALID_PARAM',
    });
  });

  it('defaults scene to Session (0)', async () => {
    nativeMock.shareText.mockResolvedValue({ errCode: 0 });
    await shareText({ text: 'hi' });
    expect(nativeMock.shareText).toHaveBeenCalledWith('hi', WeChatScene.Session);
  });

  it('forwards explicit scene', async () => {
    nativeMock.shareText.mockResolvedValue({ errCode: 0 });
    await shareText({ text: 'hi', scene: WeChatScene.Timeline });
    expect(nativeMock.shareText).toHaveBeenCalledWith('hi', WeChatScene.Timeline);
  });
});

describe('shareImage', () => {
  it('forwards {uri} image', async () => {
    nativeMock.shareImage.mockResolvedValue({ errCode: 0 });
    await shareImage({ image: { uri: 'file:///tmp/a.png' } });
    expect(nativeMock.shareImage).toHaveBeenCalledWith(
      { uri: 'file:///tmp/a.png' },
      WeChatScene.Session,
    );
  });

  it('forwards {base64} image', async () => {
    nativeMock.shareImage.mockResolvedValue({ errCode: 0 });
    await shareImage({ image: { base64: 'AAAA' }, scene: WeChatScene.Favorite });
    expect(nativeMock.shareImage).toHaveBeenCalledWith(
      { base64: 'AAAA' },
      WeChatScene.Favorite,
    );
  });

  it('rejects empty base64 with INVALID_PARAM', async () => {
    await expect(
      shareImage({ image: { base64: '' } }),
    ).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });
});

describe('shareWebpage', () => {
  it('rejects empty webpageUrl', async () => {
    await expect(
      shareWebpage({ webpageUrl: '' }),
    ).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });

  it('forwards all fields with normalized thumb', async () => {
    nativeMock.shareWebpage.mockResolvedValue({ errCode: 0 });
    await shareWebpage({
      webpageUrl: 'https://example.com',
      title: 't',
      description: 'd',
      thumb: { uri: 'https://x/y.png' },
      scene: WeChatScene.Timeline,
    });
    expect(nativeMock.shareWebpage).toHaveBeenCalledWith(
      'https://example.com',
      't',
      'd',
      { uri: 'https://x/y.png' },
      WeChatScene.Timeline,
    );
  });

  it('forwards nulls for omitted optional fields', async () => {
    nativeMock.shareWebpage.mockResolvedValue({ errCode: 0 });
    await shareWebpage({ webpageUrl: 'https://example.com' });
    expect(nativeMock.shareWebpage).toHaveBeenCalledWith(
      'https://example.com',
      null,
      null,
      null,
      WeChatScene.Session,
    );
  });
});

describe('shareMiniProgram', () => {
  const ok = { webpageUrl: 'https://h.com', userName: 'gh_abc' };

  it('rejects missing webpageUrl', async () => {
    await expect(
      shareMiniProgram({ ...ok, webpageUrl: '' }),
    ).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });

  it('rejects missing userName', async () => {
    await expect(
      shareMiniProgram({ ...ok, userName: '' }),
    ).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });

  it('rejects scene Timeline', async () => {
    await expect(
      shareMiniProgram({ ...ok, scene: WeChatScene.Timeline }),
    ).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });

  it('rejects scene Favorite', async () => {
    await expect(
      shareMiniProgram({ ...ok, scene: WeChatScene.Favorite }),
    ).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });

  it('forwards full payload with Session default', async () => {
    nativeMock.shareMiniProgram.mockResolvedValue({ errCode: 0 });
    await shareMiniProgram({
      webpageUrl: 'https://h.com',
      userName: 'gh_abc',
      path: 'pages/x',
      title: 'T',
      description: 'D',
      hdImageData: { base64: 'AAAA' },
      miniProgramType: WeChatMiniProgramType.Test,
      withShareTicket: true,
    });
    expect(nativeMock.shareMiniProgram).toHaveBeenCalledWith({
      webpageUrl: 'https://h.com',
      userName: 'gh_abc',
      path: 'pages/x',
      title: 'T',
      description: 'D',
      hdImageData: { base64: 'AAAA' },
      miniProgramType: WeChatMiniProgramType.Test,
      withShareTicket: true,
      scene: WeChatScene.Session,
    });
  });
});
