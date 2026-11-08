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
  launchMiniProgram: jest.fn(),
  shareVideo: jest.fn(),
  shareMusicVideo: jest.fn(),
  shareFile: jest.fn(),
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
  launchMiniProgram,
  shareVideo,
  shareMusicVideo,
  shareFile,
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

describe('documented length limits on existing APIs', () => {
  it('shareText rejects text over 10KB', async () => {
    await expect(shareText({ text: 'a'.repeat(10 * 1024 + 1) })).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });

  it('shareWebpage rejects title over 512 bytes (UTF-8, CJK = 3 bytes)', async () => {
    await expect(
      shareWebpage({ webpageUrl: 'https://example.com', title: '中'.repeat(171) }),
    ).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });

  it('shareWebpage accepts title of exactly 512 bytes', async () => {
    nativeMock.shareWebpage.mockResolvedValue({ errCode: 0 });
    await shareWebpage({ webpageUrl: 'https://example.com', title: 'a'.repeat(512) });
    expect(nativeMock.shareWebpage).toHaveBeenCalled();
  });
});

describe('launchMiniProgram', () => {
  it('rejects missing userName', async () => {
    await expect(launchMiniProgram({ userName: '' })).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });

  it('defaults path to null and type to Release', async () => {
    nativeMock.launchMiniProgram.mockResolvedValue(undefined);
    await launchMiniProgram({ userName: 'gh_abc' });
    expect(nativeMock.launchMiniProgram).toHaveBeenCalledWith('gh_abc', null, WeChatMiniProgramType.Release);
  });

  it('forwards path and type', async () => {
    nativeMock.launchMiniProgram.mockResolvedValue(undefined);
    await launchMiniProgram({ userName: 'gh_abc', path: 'pages/x?a=1', miniProgramType: WeChatMiniProgramType.Preview });
    expect(nativeMock.launchMiniProgram).toHaveBeenCalledWith('gh_abc', 'pages/x?a=1', WeChatMiniProgramType.Preview);
  });

  it('wraps native failure as SEND_FAIL', async () => {
    nativeMock.launchMiniProgram.mockRejectedValue(new Error('sendReq returned false'));
    await expect(launchMiniProgram({ userName: 'gh_abc' })).rejects.toMatchObject({ code: 'SEND_FAIL' });
  });
});

describe('shareVideo', () => {
  it('rejects when both urls are empty', async () => {
    await expect(shareVideo({})).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });

  it('accepts only the low-band url', async () => {
    nativeMock.shareVideo.mockResolvedValue({ errCode: 0 });
    await shareVideo({ videoLowBandUrl: 'https://v/low.mp4' });
    expect(nativeMock.shareVideo).toHaveBeenCalledWith(null, 'https://v/low.mp4', null, null, null, WeChatScene.Session);
  });

  it('forwards all fields', async () => {
    nativeMock.shareVideo.mockResolvedValue({ errCode: 0 });
    await shareVideo({
      videoUrl: 'https://v/1.mp4',
      videoLowBandUrl: 'https://v/1-low.mp4',
      title: 'T',
      description: 'D',
      thumb: { uri: 'https://x/t.png' },
      scene: WeChatScene.Timeline,
    });
    expect(nativeMock.shareVideo).toHaveBeenCalledWith(
      'https://v/1.mp4',
      'https://v/1-low.mp4',
      'T',
      'D',
      { uri: 'https://x/t.png' },
      WeChatScene.Timeline,
    );
  });

  it('rejects video url over 10KB', async () => {
    await expect(shareVideo({ videoUrl: 'https://v/' + 'a'.repeat(10 * 1024) })).rejects.toMatchObject({
      code: 'INVALID_PARAM',
    });
  });
});

describe('shareMusicVideo', () => {
  const ok = {
    title: '歌曲',
    musicUrl: 'https://m/page',
    musicDataUrl: 'https://m/a.mp3',
    singerName: '歌手',
    duration: 120000,
  };

  it.each(['title', 'musicUrl', 'musicDataUrl', 'singerName'] as const)('rejects missing %s', async (key) => {
    await expect(shareMusicVideo({ ...ok, [key]: '' })).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects invalid duration %p', async (duration) => {
    await expect(shareMusicVideo({ ...ok, duration })).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });

  it('rejects messageExt over 2KB', async () => {
    await expect(shareMusicVideo({ ...ok, messageExt: 'a'.repeat(2049) })).rejects.toMatchObject({
      code: 'INVALID_PARAM',
    });
  });

  it('forwards required fields with nulls and Session default', async () => {
    nativeMock.shareMusicVideo.mockResolvedValue({ errCode: 0 });
    await shareMusicVideo(ok);
    expect(nativeMock.shareMusicVideo).toHaveBeenCalledWith({
      ...ok,
      description: null,
      songLyric: null,
      albumName: null,
      musicGenre: null,
      issueDate: null,
      identification: null,
      messageExt: null,
      thumb: null,
      scene: WeChatScene.Session,
    });
  });

  it('forwards optional fields', async () => {
    nativeMock.shareMusicVideo.mockResolvedValue({ errCode: 0 });
    await shareMusicVideo({
      ...ok,
      description: 'D',
      songLyric: '[00:00]la',
      albumName: 'A',
      musicGenre: 'Pop',
      issueDate: 1611116532,
      identification: 'song-1',
      messageExt: 'ext',
      thumb: { base64: 'AAAA' },
      scene: WeChatScene.Favorite,
    });
    expect(nativeMock.shareMusicVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        songLyric: '[00:00]la',
        issueDate: 1611116532,
        identification: 'song-1',
        messageExt: 'ext',
        thumb: { base64: 'AAAA' },
        scene: WeChatScene.Favorite,
      }),
    );
  });
});

describe('shareFile', () => {
  it('rejects missing file', async () => {
    await expect(
      shareFile({ file: { uri: '' }, title: 'a.pdf' }),
    ).rejects.toMatchObject({ code: 'INVALID_PARAM' });
  });

  it('infers extension from uri, ignoring query and hash', async () => {
    nativeMock.shareFile.mockResolvedValue({ errCode: 0 });
    await shareFile({ file: { uri: 'https://f/docs/report.pdf?x=1#p2' }, title: 'report.pdf' });
    expect(nativeMock.shareFile).toHaveBeenCalledWith(
      { uri: 'https://f/docs/report.pdf?x=1#p2' },
      'pdf',
      'report.pdf',
      null,
      null,
      WeChatScene.Session,
    );
  });

  it('requires fileExtension for base64 data', async () => {
    await expect(shareFile({ file: { base64: 'AAAA' }, title: 'x' })).rejects.toMatchObject({
      code: 'INVALID_PARAM',
    });
  });

  it('rejects uri without extension when none given', async () => {
    await expect(shareFile({ file: { uri: 'file:///tmp/noext' }, title: 'x' })).rejects.toMatchObject({
      code: 'INVALID_PARAM',
    });
  });

  it('rejects missing title', async () => {
    await expect(shareFile({ file: { uri: 'file:///tmp/a.pdf' }, title: '' })).rejects.toMatchObject({
      code: 'INVALID_PARAM',
    });
  });

  it('forwards explicit extension and optional fields', async () => {
    nativeMock.shareFile.mockResolvedValue({ errCode: 0 });
    await shareFile({
      file: { base64: 'AAAA' },
      fileExtension: 'docx',
      title: 'a.docx',
      description: 'D',
      thumb: { uri: 'https://x/t.png' },
      scene: WeChatScene.Favorite,
    });
    expect(nativeMock.shareFile).toHaveBeenCalledWith(
      { base64: 'AAAA' },
      'docx',
      'a.docx',
      'D',
      { uri: 'https://x/t.png' },
      WeChatScene.Favorite,
    );
  });
});

describe('native failures are wrapped as WeChatError(SEND_FAIL)', () => {
  const cases: [string, keyof typeof nativeMock, () => Promise<unknown>][] = [
    ['sendAuthRequest', 'sendAuthRequest', () => sendAuthRequest()],
    ['shareText', 'shareText', () => shareText({ text: 'hi' })],
    ['shareImage', 'shareImage', () => shareImage({ image: { base64: 'AAAA' } })],
    ['shareWebpage', 'shareWebpage', () => shareWebpage({ webpageUrl: 'https://h.com' })],
    ['shareMiniProgram', 'shareMiniProgram', () => shareMiniProgram({ webpageUrl: 'https://h.com', userName: 'gh_a' })],
    ['shareVideo', 'shareVideo', () => shareVideo({ videoUrl: 'https://v/1.mp4' })],
    [
      'shareMusicVideo',
      'shareMusicVideo',
      () => shareMusicVideo({ title: 't', musicUrl: 'https://m', musicDataUrl: 'https://m/a.mp3', singerName: 's', duration: 1 }),
    ],
    ['shareFile', 'shareFile', () => shareFile({ file: { uri: 'file:///a.pdf' }, title: 'a.pdf' })],
  ];

  it.each(cases)('%s', async (_name, key, call) => {
    nativeMock[key].mockRejectedValue('native boom');
    await expect(call()).rejects.toMatchObject({ code: 'SEND_FAIL', message: 'native boom' });
  });

  it('keeps an existing WeChatError as is', async () => {
    nativeMock.shareText.mockRejectedValue(new WeChatError('NOT_REGISTERED', 'register first'));
    await expect(shareText({ text: 'hi' })).rejects.toMatchObject({ code: 'NOT_REGISTERED' });
  });
});
