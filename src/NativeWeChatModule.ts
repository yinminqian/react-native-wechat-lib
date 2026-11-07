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
    return (getNative() as any)[prop];
  },
});
