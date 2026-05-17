import { registerWebModule, NativeModule } from 'expo';

import { ReactNativeWechatLibModuleEvents } from './ReactNativeWechatLib.types';

class ReactNativeWechatLibModule extends NativeModule<ReactNativeWechatLibModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(ReactNativeWechatLibModule, 'ReactNativeWechatLibModule');
