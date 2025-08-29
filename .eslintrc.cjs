module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  extends: [ 'eslint:recommended' ],
  ignorePatterns: [ 'node_modules/', 'artifacts/', 'dist/' ],
  rules: {
    'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
    'no-console': 'off'
  }
};
