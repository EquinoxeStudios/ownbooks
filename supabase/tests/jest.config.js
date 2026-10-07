// Row-level security tests against a local Supabase stack (`npx supabase start`).
// Run with `npm run test:rls` after exporting the values from `npx supabase status -o env`.
module.exports = {
  rootDir: '../..',
  preset: 'jest-expo',
  testMatch: ['<rootDir>/supabase/tests/**/*.test.ts'],
  testTimeout: 30000,
};
