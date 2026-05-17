// Mock expo-modules-core's requireNativeModule for unit tests.
jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core');
  return {
    ...actual,
    requireNativeModule: jest.fn(),
    NativeModule: class { addListener() {} removeListener() {} },
  };
});
