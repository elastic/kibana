/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { writeFileSync } from 'fs';

import pluginHelpers from '@kbn/plugin-helpers';
import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
import gulp from 'gulp';
import del from 'del';
import fancyLog from 'fancy-log';
import chalk from 'chalk';

import { generateNoticeFromSource } from '../../src/dev/notice';
import { prepareTask } from './prepare';
import { gitInfo } from './helpers/git_info';
import { PKG_NAME } from './helpers/pkg';
import { BUILD_VERSION } from './helpers/build_version';

const BUILD_DIR = resolve(REPO_ROOT, 'x-pack/build');
const PLUGIN_BUILD_DIR = resolve(BUILD_DIR, 'plugin');

async function cleanBuildTask() {
  fancyLog('Deleting', BUILD_DIR);
  await del(BUILD_DIR);
}

async function reportTask() {
  const info = await gitInfo();

  fancyLog('Package Name', chalk.yellow(PKG_NAME));
  fancyLog('Version', chalk.yellow(BUILD_VERSION));
  fancyLog('Build Number', chalk.yellow(`${info.number}`));
  fancyLog('Build SHA', chalk.yellow(info.sha));
}

async function pluginHelpersBuild() {
  await pluginHelpers.run('build', {
    skipArchive: true,
    buildDestination: PLUGIN_BUILD_DIR,
  });
}

async function generateNoticeText() {
  const buildRoot = resolve(PLUGIN_BUILD_DIR, 'kibana/x-pack');
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  writeFileSync(
    resolve(buildRoot, 'NOTICE.txt'),
    await generateNoticeFromSource({
      productName: 'Kibana X-Pack',
      log,
      directory: buildRoot,
    })
  );
}

export const buildTask = gulp.series(
  cleanBuildTask,
  reportTask,
  prepareTask,
  pluginHelpersBuild,
  generateNoticeText
);
