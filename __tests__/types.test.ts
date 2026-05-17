import {
  WeChatScene,
  WeChatMiniProgramType,
  WeChatError,
} from '../src/types';

describe('types', () => {
  it('WeChatScene enum values match WeChat SDK constants', () => {
    expect(WeChatScene.Session).toBe(0);
    expect(WeChatScene.Timeline).toBe(1);
    expect(WeChatScene.Favorite).toBe(2);
  });

  it('WeChatMiniProgramType enum values match WeChat SDK constants', () => {
    expect(WeChatMiniProgramType.Release).toBe(0);
    expect(WeChatMiniProgramType.Test).toBe(1);
    expect(WeChatMiniProgramType.Preview).toBe(2);
  });

  it('WeChatError carries a code', () => {
    const err = new WeChatError('NOT_REGISTERED', 'call registerApp first');
    expect(err.code).toBe('NOT_REGISTERED');
    expect(err.message).toBe('call registerApp first');
    expect(err).toBeInstanceOf(Error);
  });
});
