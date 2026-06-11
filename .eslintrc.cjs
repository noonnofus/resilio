module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  ignorePatterns: ['**/dist/**', '**/.next/**', '**/node_modules/**'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  overrides: [
    {
      files: ['**/*.test-d.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
