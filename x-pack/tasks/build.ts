/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';

import { REPO_ROOT } from '@kbn/utils';
import { transformFileStream, transformFileWithBabel } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';
import gulp from 'gulp';
import del from 'del';
import fancyLog from 'fancy-log';
import chalk from 'chalk';
import vfs from 'vinyl-fs';

import { generateNoticeFromSource } from '../../src/dev/notice';
import { gitInfo } from './helpers/git_info';
import { PKG_NAME } from './helpers/pkg';
import { BUILD_VERSION } from './helpers/build_version';

const asyncPipeline = promisify(pipeline);

const XPACK_DIR = resolve(REPO_ROOT, 'x-pack');
const BUILD_DIR = resolve(XPACK_DIR, 'build');
const PLUGIN_BUILD_DIR = resolve(BUILD_DIR, 'plugin/kibana/x-pack');

async function cleanBuildTask() {
  fancyLog('Deleting', BUILD_DIR);
  await del(BUILD_DIR);

  fancyLog('[canvas] Deleting Shareable Runtime');
  await del(resolve(XPACK_DIR, 'plugins/canvas/shareable_runtime/build'));
}

async function reportTask() {
  const info = await gitInfo();

  fancyLog('Package Name', chalk.yellow(PKG_NAME));
  fancyLog('Version', chalk.yellow(BUILD_VERSION));
  fancyLog('Build Number', chalk.yellow(`${info.number}`));
  fancyLog('Build SHA', chalk.yellow(info.sha));
}

async function copySourceAndBabelify() {
  // copy source files and apply some babel transformations in the process
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
        ],
        allowEmpty: true,
      }
    ),

    transformFileStream(async (file) => {
      if (['.js', '.ts', '.tsx'].includes(file.extname)) {
        await transformFileWithBabel(file);
      }
    }),

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

async function generateNoticeText() {
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  writeFileSync(
    resolve(PLUGIN_BUILD_DIR, 'NOTICE.txt'),
    await generateNoticeFromSource({
      productName: 'Kibana X-Pack',
      log,
      directory: PLUGIN_BUILD_DIR,
    })
  );
}

export const buildTask = gulp.series(
  cleanBuildTask,
  reportTask,
  buildCanvasShareableRuntime,
  copySourceAndBabelify,
  generateNoticeText
);
