export enum WeChatScene {
  Session = 0,
  Timeline = 1,
  Favorite = 2,
}

export enum WeChatMiniProgramType {
  Release = 0,
  Test = 1,
  Preview = 2,
}

export type ImageSource =
  | { uri: string }
  | { base64: string };

/** 文件来源：本地文件 / 网络地址（`uri`），或 base64 数据 */
export type FileSource = ImageSource;

export interface AuthResponse {
  errCode: number;
  errStr?: string;
  code?: string;
  state?: string;
  lang?: string;
  country?: string;
}

export interface ShareResponse {
  errCode: number;
  errStr?: string;
  type?: number;
}

/** 小程序通过 `<button open-type="launchApp">` 跳回 App 时的回调 */
export interface LaunchMiniProgramResponse {
  errCode: number;
  errStr?: string;
  /** 对应小程序按钮的 `app-parameter` 属性 */
  extMsg?: string;
}

/** 从微信（如音乐视频播放器里的跳转入口）跳回 App 时带回的信息 */
export interface LaunchFromWXRequest {
  /** 分享时写入的 `messageExt`，任何分享类型都会透传 */
  messageExt?: string;
  /** 音乐视频分享时写入的 `identification` */
  identification?: string;
  lang?: string;
  country?: string;
}

export type WeChatErrorCode =
  | 'NOT_REGISTERED'
  | 'NOT_INSTALLED'
  | 'INVALID_PARAM'
  | 'SEND_FAIL';

export class WeChatError extends Error {
  public readonly code: WeChatErrorCode;
  constructor(code: WeChatErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'WeChatError';
  }
}
