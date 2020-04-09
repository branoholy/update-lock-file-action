module.exports = {
  env: {
    es6: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
    'plugin:json/recommended-with-comments'
  ],
  plugins: ['import', 'simple-import-sort', 'markdown'],
  rules: {
    'no-dupe-class-members': 'off',
    'no-unused-vars': 'off',
    'sort-imports': 'off',

    'import/no-default-export': 'error',
    'import/no-mutable-exports': 'error',
    'import/no-commonjs': 'error',
    'import/no-amd': 'error',
    'import/first': 'error',
    'import/no-duplicates': 'error',
    'import/newline-after-import': 'error',
    'import/no-unassigned-import': 'error',
    'import/order': 'off',

    'simple-import-sort/sort': 'error',
  }
};
