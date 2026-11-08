import { checkLength, requireString, utf8ByteLength } from '../src/limits';

describe('utf8ByteLength', () => {
  it('counts ASCII, CJK and surrogate pairs like UTF-8', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('é')).toBe(2);
    expect(utf8ByteLength('中文')).toBe(6);
    expect(utf8ByteLength('😀')).toBe(4);
    expect(utf8ByteLength('a中😀')).toBe(8);
  });
});

describe('checkLength / requireString', () => {
  it('ignores null and undefined in checkLength', () => {
    expect(() => checkLength('x', null, 1)).not.toThrow();
    expect(() => checkLength('x', undefined, 1)).not.toThrow();
  });

  it('throws INVALID_PARAM when over the byte limit', () => {
    expect(() => checkLength('x', '中', 2)).toThrow(expect.objectContaining({ code: 'INVALID_PARAM' }));
  });

  it('requireString rejects empty and returns the value otherwise', () => {
    expect(() => requireString('x', '', 10)).toThrow(expect.objectContaining({ code: 'INVALID_PARAM' }));
    expect(requireString('x', 'ok', 10)).toBe('ok');
  });
});
