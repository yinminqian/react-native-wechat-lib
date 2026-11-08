import { requireNativeModule } from 'expo';

import Native from '../src/NativeWeChatModule';

describe('NativeWeChatModule lazy proxy', () => {
  it('does not load the native module on import, then loads it once on first access', async () => {
    const mocked = requireNativeModule as jest.Mock;
    expect(mocked).not.toHaveBeenCalled();

    const getApiVersion = jest.fn().mockResolvedValue('2.0.9');
    mocked.mockReturnValue({ getApiVersion });

    await expect(Native.getApiVersion()).resolves.toBe('2.0.9');
    await Native.getApiVersion();
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(mocked).toHaveBeenCalledWith('ReactNativeWechatLib');
  });

  it('calls methods with the native module as `this`, not the proxy', () => {
    const mocked = requireNativeModule as jest.Mock;
    const nativeObject = {
      addListener(this: unknown) {
        return this;
      },
    };
    mocked.mockReturnValue(nativeObject);
    jest.isolateModules(() => {
      const isolated = require('../src/NativeWeChatModule').default as { addListener(): unknown };
      expect(isolated.addListener()).toBe(nativeObject);
    });
  });
});
