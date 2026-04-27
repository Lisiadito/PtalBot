import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        target: 'es6',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        ignoreDeprecations: '6.0',
        types: ['jest', 'node'],
      }
    }]
  },
}

export default config
