import { normalizeImageSource } from '../src/normalize';
import { WeChatError } from '../src/types';

describe('normalizeImageSource', () => {
  it('returns null for null input', () => {
    expect(normalizeImageSource(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeImageSource(undefined)).toBeNull();
  });

  it('passes through {uri}', () => {
    expect(normalizeImageSource({ uri: 'http://x/y.png' })).toEqual({
      uri: 'http://x/y.png',
    });
  });

  it('passes through {base64}', () => {
    expect(normalizeImageSource({ base64: 'AAAA' })).toEqual({
      base64: 'AAAA',
    });
  });

  it('rejects empty uri', () => {
    expect(() => normalizeImageSource({ uri: '' })).toThrow(WeChatError);
  });

  it('rejects empty base64', () => {
    expect(() => normalizeImageSource({ base64: '' })).toThrow(WeChatError);
  });

  it('rejects neither uri nor base64', () => {
    // @ts-expect-error – intentional misuse
    expect(() => normalizeImageSource({})).toThrow(WeChatError);
  });
});
