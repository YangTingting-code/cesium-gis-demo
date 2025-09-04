import js from '@eslint/js';
import globals from 'globals';
import vue from 'eslint-plugin-vue';
import tsParser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';

export default [
    js.configs.recommended,
    ...vue.configs['flat/recommended'],
    {
        files: ['**/*.{js,mjs,cjs,ts,vue}'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsParser,
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            // 可按需覆盖
        },
    },
];