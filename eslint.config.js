import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        CustomEvent: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        performance: 'readonly',
        NodeFilter: 'readonly',
        Node: 'readonly',
        // Node.js globals for scripts
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { 
        args: 'none', 
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
        caughtErrors: 'none'
      }],
      'no-console': 'off'
    }
  },
  {
    ignores: ['node_modules/', 'artifacts/', 'dist/']
  }
];