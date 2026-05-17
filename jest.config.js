/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  roots: ['<rootDir>/src', '<rootDir>/__tests__', '<rootDir>/plugin/src'],
  collectCoverageFrom: ['src/**/*.ts', 'plugin/src/**/*.ts'],
  coverageThreshold: {
    global: { branches: 70, functions: 80, lines: 80, statements: 80 },
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
};
