const config = {
  'src/**/*.ts': [
    'eslint --fix',
    'node scripts/check-test-pairs.mjs',
    'prettier --write',
  ],
  '*.{js,jsx,mjs,cjs,json,css,md}': ['prettier --write'],
};

export default config;
