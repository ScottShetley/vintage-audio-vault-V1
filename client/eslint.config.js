// client/.eslintrc.cjs
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true, // Ensure this is present
    node: false,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: {
    ecmaVersion: 'latest', // Use the latest ECMAScript syntax
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: '18.2',
    },
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      {allowConstantExport: true},
    ],
    'react/jsx-no-target-blank': 'off',
    'react/no-unknown-property': 'off',
    'no-unused-vars': 'warn',
    'react/prop-types': 'off',
  },
};
