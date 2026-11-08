import { WeChatError } from './types';

/**
 * 微信开放平台文档（分享与收藏 · iOS / Android 开发手册）规定的字段长度上限，单位字节（UTF-8）。
 * 超限时微信 SDK 的参数校验会直接拒绝发送，这里提前给出明确的错误信息。
 */
export const LIMITS = {
  /** WXMediaMessage.title */
  title: 512,
  /** WXMediaMessage.description */
  description: 1024,
  /** WXTextObject.text */
  text: 10 * 1024,
  /** 网页 / 视频 / 音频等链接字段 */
  url: 10 * 1024,
  /** WXMusicVideoObject.singerName */
  singerName: 1024,
  /** WXMusicVideoObject.songLyric */
  songLyric: 32 * 1024,
  /** WXMediaMessage.messageExt */
  messageExt: 2 * 1024,
  /** WXFileObject.fileExtension（iOS） */
  fileExtension: 64,
} as const;

/** 字符串按 UTF-8 编码后的字节数 */
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
      // 代理对（如 emoji）合起来是 4 字节
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

/** 可选字符串字段：有值时检查长度上限 */
export function checkLength(name: string, value: string | null | undefined, maxBytes: number): void {
  if (value == null) return;
  if (utf8ByteLength(value) > maxBytes) {
    throw new WeChatError('INVALID_PARAM', `${name} exceeds ${maxBytes} bytes (UTF-8)`);
  }
}

/** 必填字符串字段：非空且不超过长度上限 */
export function requireString(name: string, value: string | null | undefined, maxBytes: number): string {
  if (!value) throw new WeChatError('INVALID_PARAM', `${name} is required`);
  checkLength(name, value, maxBytes);
  return value;
}
