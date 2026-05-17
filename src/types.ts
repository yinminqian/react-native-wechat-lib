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
