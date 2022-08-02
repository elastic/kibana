/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { resolve } from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';

import { discoverBazelPackages } from '@kbn/bazel-packages';
import { REPO_ROOT } from '@kbn/utils';
import { ToolingLog } from '@kbn/tooling-log';
import gulp from 'gulp';
import del from 'del';
import vfs from 'vinyl-fs';

const asyncPipeline = promisify(pipeline);

const XPACK_DIR = resolve(REPO_ROOT, 'x-pack');
const BUILD_DIR = resolve(XPACK_DIR, 'build');
const PLUGIN_BUILD_DIR = resolve(BUILD_DIR, 'plugin/kibana/x-pack');

async function cleanBuildTask() {
  const log = new ToolingLog();
  log.info('Deleting', BUILD_DIR);
  await del(BUILD_DIR);

  log.info('[canvas] Deleting Shareable Runtime');
  await del(resolve(XPACK_DIR, 'plugins/canvas/shareable_runtime/build'));
}

async function copySource() {
  // get bazel packages inside x-pack
  const xpackBazelPackages = (await discoverBazelPackages())
    .filter((pkg) => pkg.normalizedRepoRelativeDir.startsWith('x-pack/'))
    .map((pkg) => `${pkg.normalizedRepoRelativeDir.replace('x-pack/', '')}/**`);

  // copy source files
  await asyncPipeline(
    vfs.src(
      [
        'LICENSE.txt',
        'NOTICE.txt',
        'package.json',
        'yarn.lock',
        'tsconfig.json',
        'index.js',
        '.i18nrc.json',
        'plugins/**/*',
        'typings/**/*',
      ],
      {
        cwd: XPACK_DIR,
        base: XPACK_DIR,
        buffer: true,
        nodir: true,
        ignore: [
          '**/*.{md,mdx,asciidoc}',
          '**/jest.config.js',
          '**/jest.config.dev.js',
          '**/jest_setup.js',
          '**/jest.integration.config.js',
          '**/*.stories.js',
          '**/*.{test,test.mocks,mock,mocks}.*',
          '**/*.d.ts',
          '**/node_modules/**',
          '**/public/**/*.{js,ts,tsx,json,scss}',
          '**/{test,__tests__,__mocks__,__snapshots__,__fixtures__,__jest__,cypress,fixtures}/**',
          'plugins/*/target/**',
          'plugins/canvas/shareable_runtime/test/**',
          'plugins/screenshotting/chromium/**',
          'plugins/telemetry_collection_xpack/schema/**', // Skip telemetry schemas
          'plugins/apm/ftr_e2e/**',
          'plugins/apm/scripts/**',
          'plugins/lists/server/scripts/**',
          ...xpackBazelPackages,
        ],
        allowEmpty: true,
      }
    ),

    vfs.dest(PLUGIN_BUILD_DIR)
  );
}

async function buildCanvasShareableRuntime() {
  await execa(
    process.execPath,
    ['--preserve-symlinks', 'plugins/canvas/scripts/shareable_runtime'],
    {
      cwd: XPACK_DIR,
      stdio: ['ignore', 'inherit', 'inherit'],
      // @ts-ignore Incorrect @types - execa supports `buffer`
      buffer: false,
    }
  );
}

export const buildTask = gulp.series(cleanBuildTask, buildCanvasShareableRuntime, copySource);
