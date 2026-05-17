import { NativeModule, requireNativeModule } from 'expo';

import { ReactNativeWechatLibModuleEvents } from './ReactNativeWechatLib.types';

declare class ReactNativeWechatLibModule extends NativeModule<ReactNativeWechatLibModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ReactNativeWechatLibModule>('ReactNativeWechatLib');
