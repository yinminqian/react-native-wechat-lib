// 单元测试不加载原生模块：把 expo 的 requireNativeModule 换成可控的 mock。
jest.mock('expo', () => ({
  requireNativeModule: jest.fn(),
  requireOptionalNativeModule: jest.fn(() => null),
  NativeModule: class {
    addListener() {
      return { remove() {} };
    }
    removeListener() {}
  },
}));
