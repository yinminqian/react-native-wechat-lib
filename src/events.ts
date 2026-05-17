import Native from './NativeWeChatModule';
import type { AuthResponse, ShareResponse } from './types';

export function addAuthListener(fn: (resp: AuthResponse) => void): () => void {
  const sub = (Native as unknown as {
    addListener(evt: string, cb: (a: AuthResponse) => void): { remove(): void };
  }).addListener('onAuthResp', fn);
  return () => sub.remove();
}

export function addShareListener(fn: (resp: ShareResponse) => void): () => void {
  const sub = (Native as unknown as {
    addListener(evt: string, cb: (a: ShareResponse) => void): { remove(): void };
  }).addListener('onShareResp', fn);
  return () => sub.remove();
}
