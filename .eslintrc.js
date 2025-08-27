module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  globals: {
    // Dynamics 365 globals
    Xrm: 'readonly',
    GetGlobalContext: 'readonly',

    // Browser globals commonly used in Dynamics 365
    window: 'readonly',
    document: 'readonly',
    console: 'readonly',

    // Common utilities
    JSON: 'readonly',
    Promise: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly'
  },
  rules: {
    // Code quality
    'no-unused-vars': 'warn',
    'no-console': 'off', // Allow console for debugging in Dynamics 365
    'no-debugger': 'error',
    'no-alert': 'warn',

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    // Best practices
    eqeqeq: 'error',
    'no-var': 'error',
    'prefer-const': 'warn',
    'prefer-arrow-callback': 'warn',
    'no-magic-numbers': [
      'warn',
      {
        ignore: [-1, 0, 1, 2],
        ignoreArrayIndexes: true
      }
    ],

    // Dynamics 365 specific
    'no-undef': 'error', // Catch undefined variables
    'no-global-assign': 'error',
    'no-implicit-globals': 'error',

    // Code style
    indent: ['error', 2],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'max-len': ['warn', { code: 100 }],
    'max-lines': ['warn', { max: 300 }],
    'max-depth': ['warn', 4],
    complexity: ['warn', 10],

    // Error handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error'
  },
  overrides: [
    {
      // Node.js scripts
      files: ['scripts/**/*.js'],
      env: {
        node: true,
        browser: false
      },
      rules: {
        'no-console': 'off'
      }
    },
    {
      // Example commands
      files: ['examples/**/*.js'],
      rules: {
        'no-console': 'off',
        'max-lines': 'off' // Examples can be longer for educational purposes
      }
    }
  ]
};
