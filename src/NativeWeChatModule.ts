import { NativeModule, requireNativeModule } from 'expo';

export interface NativeWeChatModuleType extends NativeModule {
  registerApp(appId: string, universalLink: string | null): Promise<void>;
  isWXAppInstalled(): Promise<boolean>;
  getApiVersion(): Promise<string>;
  openWXApp(): Promise<boolean>;
  sendAuthRequest(scope: string, state: string): Promise<{
    errCode: number;
    errStr?: string;
    code?: string;
    state?: string;
    lang?: string;
    country?: string;
  }>;
  shareText(text: string, scene: number): Promise<{ errCode: number; errStr?: string; type?: number }>;
  shareImage(image: { uri?: string; base64?: string }, scene: number): Promise<{ errCode: number; errStr?: string; type?: number }>;
  shareWebpage(
    webpageUrl: string,
    title: string | null,
    description: string | null,
    thumb: { uri?: string; base64?: string } | null,
    scene: number,
  ): Promise<{ errCode: number; errStr?: string; type?: number }>;
  shareMiniProgram(opts: {
    webpageUrl: string;
    userName: string;
    path?: string | null;
    title?: string | null;
    description?: string | null;
    hdImageData?: { uri?: string; base64?: string } | null;
    miniProgramType?: number;
    withShareTicket?: boolean;
    scene: number;
  }): Promise<{ errCode: number; errStr?: string; type?: number }>;
  launchMiniProgram(userName: string, path: string | null, miniProgramType: number): Promise<void>;
  shareVideo(
    videoUrl: string | null,
    videoLowBandUrl: string | null,
    title: string | null,
    description: string | null,
    thumb: { uri?: string; base64?: string } | null,
    scene: number,
  ): Promise<{ errCode: number; errStr?: string; type?: number }>;
  shareMusicVideo(opts: {
    title: string;
    musicUrl: string;
    musicDataUrl: string;
    singerName: string;
    duration: number;
    description: string | null;
    songLyric: string | null;
    albumName: string | null;
    musicGenre: string | null;
    issueDate: number | null;
    identification: string | null;
    messageExt: string | null;
    thumb: { uri?: string; base64?: string } | null;
    scene: number;
  }): Promise<{ errCode: number; errStr?: string; type?: number }>;
  shareFile(
    file: { uri?: string; base64?: string },
    fileExtension: string,
    title: string,
    description: string | null,
    thumb: { uri?: string; base64?: string } | null,
    scene: number,
  ): Promise<{ errCode: number; errStr?: string; type?: number }>;
}

// Use a lazy proxy so that module-level import does not throw when the
// native side isn't registered yet (e.g. on web or when the JSI runtime
// hasn't finished installing modules before this file is evaluated).
let _native: NativeWeChatModuleType | null = null;

function getNative(): NativeWeChatModuleType {
  if (!_native) {
    _native = requireNativeModule<NativeWeChatModuleType>('ReactNativeWechatLib');
  }
  return _native;
}

export default new Proxy({} as NativeWeChatModuleType, {
  get(_target, prop: string) {
    const native = getNative();
    const value = (native as any)[prop];
    // 方法必须绑定回原生模块：经代理调用时 this 会是 Proxy，
    // addListener 等依赖原生状态的 HostFunction 会抛 "native state unsupported on Proxy"
    return typeof value === 'function' ? value.bind(native) : value;
  },
});
