// Row-level security tests against a local Supabase stack (`npx supabase start`).
// Run with `npm run test:rls` after exporting the values from `npx supabase status -o env`.
// Plain Node environment: the jest-expo preset mocks fetch, which these tests need.
module.exports = {
  rootDir: '../..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/supabase/tests/**/*.test.ts'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  testTimeout: 30000,
};
