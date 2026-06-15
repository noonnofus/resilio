import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url).pathname;
const temp = await mkdtemp(join(tmpdir(), 'resilio-packed-'));
const packed = join(temp, 'packed');
const consumer = join(temp, 'consumer');
const packages = ['core', 'react', 'tanstack', 'next'];

try {
  run('mkdir', ['-p', packed, consumer]);
  run('pnpm', ['build'], root);

  for (const name of packages) {
    run('pnpm', [
      '--filter',
      `@resiliojs/${name}`,
      'pack',
      '--pack-destination',
      packed,
      '--json',
    ], root);
  }

  const tarballs = (await readdir(packed))
    .filter((file) => file.endsWith('.tgz'))
    .map((file) => join(packed, file));

  if (tarballs.length !== packages.length) {
    throw new Error(`Expected ${packages.length} tarballs, found ${tarballs.length}.`);
  }

  for (const tarball of tarballs) {
    const output = run('tar', ['-xOzf', tarball, 'package/package.json'], root, true);
    if (output.includes('workspace:') || output.includes('"@resilio/')) {
      throw new Error(`Unpublishable dependency reference found in ${tarball}.`);
    }
  }

  await writeFile(join(consumer, 'package.json'), JSON.stringify({
    name: 'resilio-packed-consumer',
    private: true,
    type: 'module',
  }, null, 2));

  run('npm', [
    'install',
    '--no-audit',
    '--no-fund',
    ...tarballs,
    'react@19',
    'react-dom@19',
    '@types/react@19',
    '@types/react-dom@19',
    'next@16',
    '@tanstack/query-core@5',
    '@tanstack/react-router@1',
    '@tanstack/form-core@1',
    'typescript@5',
  ], consumer);

  await writeFile(join(consumer, 'esm.mjs'), `
await Promise.all([
  import('@resiliojs/core'),
  import('@resiliojs/react'),
  import('@resiliojs/next'),
  import('@resiliojs/next/client'),
  import('@resiliojs/tanstack'),
  import('@resiliojs/tanstack/query'),
  import('@resiliojs/tanstack/router'),
  import('@resiliojs/tanstack/form'),
]);
`);
  await writeFile(join(consumer, 'cjs.cjs'), `
require('@resiliojs/core');
require('@resiliojs/react');
require('@resiliojs/next');
require('@resiliojs/next/client');
require('@resiliojs/tanstack');
require('@resiliojs/tanstack/query');
require('@resiliojs/tanstack/router');
require('@resiliojs/tanstack/form');
`);
  await writeFile(join(consumer, 'types.ts'), `
import { createPresentationEvaluator, defineErrorCatalog, definePresentationPolicy } from '@resiliojs/core';
import { ResilioProvider } from '@resiliojs/react';
import { useResilioState } from '@resiliojs/next/client';
import { createResilioQueryCacheCallbacks } from '@resiliojs/tanstack/query';
import { createResilioRouterLifecycle } from '@resiliojs/tanstack/router';
import { createResilioFormErrorMapper } from '@resiliojs/tanstack/form';

void [
  createPresentationEvaluator,
  defineErrorCatalog,
  definePresentationPolicy,
  ResilioProvider,
  useResilioState,
  createResilioQueryCacheCallbacks,
  createResilioRouterLifecycle,
  createResilioFormErrorMapper,
];
`);
  await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      strict: true,
      noEmit: true,
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      target: 'ES2022',
      jsx: 'react-jsx',
      skipLibCheck: false,
    },
    include: ['types.ts'],
  }, null, 2));

  run('node', ['esm.mjs'], consumer);
  run('node', ['cjs.cjs'], consumer);
  run('npx', ['tsc', '--noEmit'], consumer);

  console.log('Packed package consumer verification passed.');
} finally {
  await rm(temp, { recursive: true, force: true });
}

function run(command, args, cwd = root, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr ?? ''}`);
  }
  return result.stdout ?? '';
}
