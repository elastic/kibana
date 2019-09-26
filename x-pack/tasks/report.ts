/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chalk from 'chalk';
import gulp from 'gulp';
import log from 'fancy-log';

import { gitInfo } from './helpers/git_info';
import { PKG_NAME } from './helpers/pkg';
import { BUILD_VERSION } from './helpers/build_version';

export const reportTask: gulp.TaskFunction = async () => {
  const info = await gitInfo();

  log('Package Name', chalk.yellow(PKG_NAME));
  log('Version', chalk.yellow(BUILD_VERSION));
  log('Build Number', chalk.yellow(`${info.number}`));
  log('Build SHA', chalk.yellow(info.sha));
};
