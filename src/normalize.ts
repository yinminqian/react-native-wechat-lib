import type { ImageSource } from './types';
import { WeChatError } from './types';

export function normalizeImageSource(
  src: ImageSource | null | undefined,
): { uri?: string; base64?: string } | null {
  if (src == null) return null;
  if ('uri' in src) {
    if (!src.uri) throw new WeChatError('INVALID_PARAM', 'image.uri is empty');
    return { uri: src.uri };
  }
  if ('base64' in src) {
    if (!src.base64) throw new WeChatError('INVALID_PARAM', 'image.base64 is empty');
    return { base64: src.base64 };
  }
  throw new WeChatError('INVALID_PARAM', 'image must have uri or base64');
}
