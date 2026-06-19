module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/__tests__/**', '!src/index.ts', '!src/types/index.ts'],
  moduleNameMapper: {
    '^@observability/config$': '<rootDir>/../config/src',
  },
};
