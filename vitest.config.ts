import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = {
  '@': path.resolve(__dirname, 'src'),
  'server-only': path.resolve(__dirname, 'tests/server-only-stub.ts'),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.int.test.ts'],
          env: { AUTH_DISABLED: '' },
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/**/*.int.test.ts'],
          globalSetup: ['tests/global-setup.ts'],
          fileParallelism: false,
          env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '', AUTH_DISABLED: '' },
        },
      },
    ],
  },
});
