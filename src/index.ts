import Native from './NativeWeChatModule';
import { WeChatError } from './types';
import type { AuthResponse, ShareResponse, ImageSource } from './types';
import { WeChatScene, WeChatMiniProgramType } from './types';
import { normalizeImageSource } from './normalize';

export * from './types';

function wrap(err: unknown): never {
  if (err instanceof WeChatError) throw err;
  throw new WeChatError('SEND_FAIL', err instanceof Error ? err.message : String(err));
}

export async function registerApp(
  appId: string,
  universalLink?: string,
): Promise<void> {
  try {
    await Native.registerApp(appId, universalLink ?? null);
  } catch (e) {
    wrap(e);
  }
}

export function isWXAppInstalled(): Promise<boolean> {
  return Native.isWXAppInstalled();
}

export function getApiVersion(): Promise<string> {
  return Native.getApiVersion();
}

export function openWXApp(): Promise<boolean> {
  return Native.openWXApp();
}

function defaultState(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function sendAuthRequest(
  scope: string = 'snsapi_userinfo',
  state: string = defaultState(),
): Promise<AuthResponse> {
  try {
    return await Native.sendAuthRequest(scope, state);
  } catch (e) {
    wrap(e);
  }
}

export async function shareText(opts: {
  text: string;
  scene?: WeChatScene;
}): Promise<ShareResponse> {
  if (!opts.text) {
    throw new WeChatError('INVALID_PARAM', 'text is required');
  }
  try {
    return await Native.shareText(opts.text, opts.scene ?? WeChatScene.Session);
  } catch (e) {
    wrap(e);
  }
}

export async function shareImage(opts: {
  image: ImageSource;
  scene?: WeChatScene;
}): Promise<ShareResponse> {
  const image = normalizeImageSource(opts.image);
  if (image == null) {
    throw new WeChatError('INVALID_PARAM', 'image is required');
  }
  try {
    return await Native.shareImage(image, opts.scene ?? WeChatScene.Session);
  } catch (e) {
    wrap(e);
  }
}

export async function shareWebpage(opts: {
  webpageUrl: string;
  title?: string;
  description?: string;
  thumb?: ImageSource;
  scene?: WeChatScene;
}): Promise<ShareResponse> {
  if (!opts.webpageUrl) {
    throw new WeChatError('INVALID_PARAM', 'webpageUrl is required');
  }
  try {
    return await Native.shareWebpage(
      opts.webpageUrl,
      opts.title ?? null,
      opts.description ?? null,
      normalizeImageSource(opts.thumb),
      opts.scene ?? WeChatScene.Session,
    );
  } catch (e) {
    wrap(e);
  }
}

export async function shareMiniProgram(opts: {
  webpageUrl: string;
  userName: string;
  path?: string;
  title?: string;
  description?: string;
  hdImageData?: ImageSource;
  miniProgramType?: WeChatMiniProgramType;
  withShareTicket?: boolean;
  scene?: WeChatScene;
}): Promise<ShareResponse> {
  if (!opts.webpageUrl) {
    throw new WeChatError('INVALID_PARAM', 'webpageUrl is required');
  }
  if (!opts.userName) {
    throw new WeChatError('INVALID_PARAM', 'userName is required');
  }
  const scene = opts.scene ?? WeChatScene.Session;
  if (scene !== WeChatScene.Session) {
    throw new WeChatError(
      'INVALID_PARAM',
      'shareMiniProgram only supports WeChatScene.Session',
    );
  }
  try {
    return await Native.shareMiniProgram({
      webpageUrl: opts.webpageUrl,
      userName: opts.userName,
      path: opts.path ?? null,
      title: opts.title ?? null,
      description: opts.description ?? null,
      hdImageData: normalizeImageSource(opts.hdImageData),
      miniProgramType: opts.miniProgramType ?? WeChatMiniProgramType.Release,
      withShareTicket: opts.withShareTicket ?? false,
      scene,
    });
  } catch (e) {
    wrap(e);
  }
}

export { addAuthListener, addShareListener } from './events';
