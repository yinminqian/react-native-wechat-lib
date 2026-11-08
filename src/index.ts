import Native from './NativeWeChatModule';
import { checkLength, LIMITS, requireString } from './limits';
import { normalizeImageSource } from './normalize';
import {
  type AuthResponse,
  type FileSource,
  type ImageSource,
  type ShareResponse,
  WeChatError,
  WeChatMiniProgramType,
  WeChatScene,
} from './types';

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

function checkTitleAndDescription(opts: { title?: string | null; description?: string | null }): void {
  checkLength('title', opts.title, LIMITS.title);
  checkLength('description', opts.description, LIMITS.description);
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
  requireString('text', opts.text, LIMITS.text);
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
  requireString('webpageUrl', opts.webpageUrl, LIMITS.url);
  checkTitleAndDescription(opts);
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
  requireString('webpageUrl', opts.webpageUrl, LIMITS.url);
  if (!opts.userName) {
    throw new WeChatError('INVALID_PARAM', 'userName is required');
  }
  checkTitleAndDescription(opts);
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

/**
 * 拉起小程序（微信开放平台「APP 拉起小程序功能」）。
 *
 * 请求成功发出即返回；小程序通过 `<button open-type="launchApp">` 跳回 App 时，
 * 跳回携带的 `app-parameter` 经 `addLaunchMiniProgramListener` 的 `extMsg` 回调。
 * 用户直接从微信返回不会有回调，所以这里不等待跳回。
 */
export async function launchMiniProgram(opts: {
  /** 小程序原始 ID（gh_ 开头） */
  userName: string;
  /** 页面路径，可带参数；不填打开首页。小游戏可只传 query，如 "?foo=bar" */
  path?: string;
  miniProgramType?: WeChatMiniProgramType;
}): Promise<void> {
  if (!opts.userName) {
    throw new WeChatError('INVALID_PARAM', 'userName is required');
  }
  try {
    await Native.launchMiniProgram(
      opts.userName,
      opts.path ?? null,
      opts.miniProgramType ?? WeChatMiniProgramType.Release,
    );
  } catch (e) {
    wrap(e);
  }
}

/** 分享视频链接（`videoUrl` 与 `videoLowBandUrl` 不能同时为空） */
export async function shareVideo(opts: {
  videoUrl?: string;
  /** 低带宽环境下使用的视频链接 */
  videoLowBandUrl?: string;
  title?: string;
  description?: string;
  thumb?: ImageSource;
  scene?: WeChatScene;
}): Promise<ShareResponse> {
  if (!opts.videoUrl && !opts.videoLowBandUrl) {
    throw new WeChatError('INVALID_PARAM', 'videoUrl or videoLowBandUrl is required');
  }
  checkLength('videoUrl', opts.videoUrl, LIMITS.url);
  checkLength('videoLowBandUrl', opts.videoLowBandUrl, LIMITS.url);
  checkTitleAndDescription(opts);
  try {
    return await Native.shareVideo(
      opts.videoUrl || null,
      opts.videoLowBandUrl || null,
      opts.title ?? null,
      opts.description ?? null,
      normalizeImageSource(opts.thumb),
      opts.scene ?? WeChatScene.Session,
    );
  } catch (e) {
    wrap(e);
  }
}

/**
 * 分享音乐视频（点开进入微信原生音乐播放器）。
 * 需要先按微信开放平台文档发邮件申请「音乐 / 音乐视频类型分享权限」，未开通时微信会拒绝。
 * 用户在播放器里点跳转入口回到 App 时，`messageExt` 与 `identification` 经 `addLaunchFromWXListener` 回调。
 */
export async function shareMusicVideo(opts: {
  /** 歌曲名称（必填） */
  title: string;
  /** 音频网页的 URL（必填） */
  musicUrl: string;
  /** 音频数据的 URL（必填） */
  musicDataUrl: string;
  /** 歌手名（必填） */
  singerName: string;
  /** 歌曲时长，毫秒（必填，大于 0） */
  duration: number;
  description?: string;
  /** 歌词，LRC 格式 */
  songLyric?: string;
  albumName?: string;
  musicGenre?: string;
  /** 发行时间，Unix 时间戳（秒） */
  issueDate?: number;
  /** 音乐标识符，跳回 App 时原样带回；iOS 与 Android 要一致 */
  identification?: string;
  /** 额外信息，跳回 App 时原样带回；iOS 与 Android 要一致 */
  messageExt?: string;
  thumb?: ImageSource;
  scene?: WeChatScene;
}): Promise<ShareResponse> {
  requireString('title', opts.title, LIMITS.title);
  requireString('musicUrl', opts.musicUrl, LIMITS.url);
  requireString('musicDataUrl', opts.musicDataUrl, LIMITS.url);
  requireString('singerName', opts.singerName, LIMITS.singerName);
  if (!Number.isInteger(opts.duration) || opts.duration <= 0) {
    throw new WeChatError('INVALID_PARAM', 'duration must be a positive integer (milliseconds)');
  }
  if (opts.issueDate != null && (!Number.isInteger(opts.issueDate) || opts.issueDate < 0)) {
    throw new WeChatError('INVALID_PARAM', 'issueDate must be a Unix timestamp in seconds');
  }
  checkLength('description', opts.description, LIMITS.description);
  checkLength('songLyric', opts.songLyric, LIMITS.songLyric);
  checkLength('messageExt', opts.messageExt, LIMITS.messageExt);
  try {
    return await Native.shareMusicVideo({
      title: opts.title,
      musicUrl: opts.musicUrl,
      musicDataUrl: opts.musicDataUrl,
      singerName: opts.singerName,
      duration: opts.duration,
      description: opts.description ?? null,
      songLyric: opts.songLyric ?? null,
      albumName: opts.albumName ?? null,
      musicGenre: opts.musicGenre ?? null,
      issueDate: opts.issueDate ?? null,
      identification: opts.identification ?? null,
      messageExt: opts.messageExt ?? null,
      thumb: normalizeImageSource(opts.thumb),
      scene: opts.scene ?? WeChatScene.Session,
    });
  } catch (e) {
    wrap(e);
  }
}

/** 从 uri 末尾取扩展名（忽略 query / hash） */
function extensionFromUri(uri: string): string | null {
  const clean = uri.split(/[?#]/)[0] ?? '';
  const name = clean.slice(clean.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1) : null;
}

/**
 * 分享文件（如 PDF）。文件以二进制数据传给微信：iOS 上限 10MB；
 * Android 由 SDK 与微信客户端校验。官方示例的场景是会话，其他场景以微信客户端的校验为准。
 */
export async function shareFile(opts: {
  file: FileSource;
  /** 扩展名（不含点），如 "pdf"；不传时从 file.uri 推断 */
  fileExtension?: string;
  /** 一般填文件名，会显示在消息里 */
  title: string;
  description?: string;
  thumb?: ImageSource;
  scene?: WeChatScene;
}): Promise<ShareResponse> {
  const file = normalizeImageSource(opts.file);
  if (file == null) {
    throw new WeChatError('INVALID_PARAM', 'file is required');
  }
  const extension = opts.fileExtension || (file.uri ? extensionFromUri(file.uri) : null);
  requireString('fileExtension', extension, LIMITS.fileExtension);
  requireString('title', opts.title, LIMITS.title);
  checkLength('description', opts.description, LIMITS.description);
  try {
    return await Native.shareFile(
      file,
      extension!,
      opts.title,
      opts.description ?? null,
      normalizeImageSource(opts.thumb),
      opts.scene ?? WeChatScene.Session,
    );
  } catch (e) {
    wrap(e);
  }
}

export {
  addAuthListener,
  addLaunchFromWXListener,
  addLaunchMiniProgramListener,
  addShareListener,
} from './events';
