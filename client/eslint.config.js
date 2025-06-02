// client/.eslintrc.cjs
module.exports = {
  root: true,
  env: {
    browser: true, // Enable browser global variables
    es2020: true, // Enable ES2020 globals
    node: false, // Explicitly disable Node.js global variables like 'require' and 'module'
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
    sourceType: 'module', // Enable ES Modules syntax (import/export)
    ecmaFeatures: {
      jsx: true, // Enable JSX parsing
    },
  },
  settings: {
    react: {
      version: '18.2', // Specify React version
    },
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      {allowConstantExport: true},
    ],
    // Basic React/JSX rules that are often useful
    'react/jsx-no-target-blank': 'off',
    'react/no-unknown-property': 'off', // Often triggered by Tailwind-like classes, adjust as needed
    // Relaxing some rules often too strict for quick development
    'no-unused-vars': 'warn', // Change 'error' to 'warn' or add specific ignores
    'react/prop-types': 'off', // Turn off prop-types warning for now (can re-enable with TypeScript or proper prop-types usage)
  },
};
