import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['out', 'dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules }
  },
  {
    files: ['scripts/**/*.{cjs,mts}'],
    languageOptions: {
      globals: { require: 'readonly', __dirname: 'readonly', process: 'readonly', console: 'readonly', Buffer: 'readonly', fetch: 'readonly' }
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' }
  }
)
