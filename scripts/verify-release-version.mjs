import { readFile } from 'node:fs/promises';

const tag = process.env.GITHUB_REF_NAME;
if (!tag?.startsWith('v')) {
  throw new Error('Release workflow must run from a v-prefixed tag.');
}

const expected = tag.slice(1);
const paths = [
  'package.json',
  'packages/core/package.json',
  'packages/react/package.json',
  'packages/tanstack/package.json',
  'packages/next/package.json',
];

for (const path of paths) {
  const pkg = JSON.parse(await readFile(path, 'utf8'));
  if (pkg.version !== expected) {
    throw new Error(`${path} version ${pkg.version} does not match tag ${tag}.`);
  }
}

console.log(`Release versions match ${tag}.`);
