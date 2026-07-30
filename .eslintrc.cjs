module.exports = {
  root: true,
  env: { es2020: true, node: true, jest: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars': 'off',
    'no-dupe-class-members': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/'],
};
