const listeners: Record<string, ((arg: unknown) => void)[]> = {};
const nativeMock = {
  addListener: jest.fn((evt: string) => {
    listeners[evt] ??= [];
  }),
  removeListener: jest.fn(),
};

jest.mock('../src/NativeWeChatModule', () => ({
  __esModule: true,
  default: {
    addListener: (evt: string, cb: (arg: unknown) => void) => {
      nativeMock.addListener(evt);
      listeners[evt] ??= [];
      listeners[evt].push(cb);
      return { remove: () => {
        listeners[evt] = listeners[evt].filter((c) => c !== cb);
      }};
    },
  },
}));

import {
  addAuthListener,
  addLaunchFromWXListener,
  addLaunchMiniProgramListener,
  addShareListener,
} from '../src/events';

describe('event listeners', () => {
  beforeEach(() => {
    for (const k of Object.keys(listeners)) listeners[k] = [];
  });

  it('addAuthListener subscribes to onAuthResp', () => {
    const fn = jest.fn();
    addAuthListener(fn);
    listeners['onAuthResp'][0]({ errCode: 0, code: 'abc' });
    expect(fn).toHaveBeenCalledWith({ errCode: 0, code: 'abc' });
  });

  it('addShareListener subscribes to onShareResp', () => {
    const fn = jest.fn();
    addShareListener(fn);
    listeners['onShareResp'][0]({ errCode: 0 });
    expect(fn).toHaveBeenCalledWith({ errCode: 0 });
  });

  it('addLaunchMiniProgramListener subscribes to onLaunchMiniProgramResp', () => {
    const fn = jest.fn();
    addLaunchMiniProgramListener(fn);
    listeners['onLaunchMiniProgramResp'][0]({ errCode: 0, extMsg: 'from-mp' });
    expect(fn).toHaveBeenCalledWith({ errCode: 0, extMsg: 'from-mp' });
  });

  it('addLaunchFromWXListener subscribes to onLaunchFromWX', () => {
    const fn = jest.fn();
    addLaunchFromWXListener(fn);
    listeners['onLaunchFromWX'][0]({ messageExt: 'ext', identification: 'song-1' });
    expect(fn).toHaveBeenCalledWith({ messageExt: 'ext', identification: 'song-1' });
  });

  it('returned unsubscribe stops the listener', () => {
    const fn = jest.fn();
    const off = addAuthListener(fn);
    off();
    expect(listeners['onAuthResp'].length).toBe(0);
  });
});
