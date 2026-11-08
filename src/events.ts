import Native from './NativeWeChatModule';
import type { AuthResponse, LaunchFromWXRequest, LaunchMiniProgramResponse, ShareResponse } from './types';

type Subscribable = {
  addListener<T>(evt: string, cb: (a: T) => void): { remove(): void };
};

function listen<T>(event: string, fn: (payload: T) => void): () => void {
  const sub = (Native as unknown as Subscribable).addListener<T>(event, fn);
  return () => sub.remove();
}

export function addAuthListener(fn: (resp: AuthResponse) => void): () => void {
  return listen('onAuthResp', fn);
}

export function addShareListener(fn: (resp: ShareResponse) => void): () => void {
  return listen('onShareResp', fn);
}

/** 小程序通过 `<button open-type="launchApp">` 跳回 App 时触发 */
export function addLaunchMiniProgramListener(fn: (resp: LaunchMiniProgramResponse) => void): () => void {
  return listen('onLaunchMiniProgramResp', fn);
}

/**
 * 从微信跳回 App 时触发（如在音乐视频播放器里点跳转入口）。
 * App 被微信冷启动时，回调会在开始监听后补发。
 */
export function addLaunchFromWXListener(fn: (req: LaunchFromWXRequest) => void): () => void {
  return listen('onLaunchFromWX', fn);
}
