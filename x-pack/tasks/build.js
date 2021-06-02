/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { writeFileSync } from 'fs';
import gulp from 'gulp';
import pluginHelpers from '@kbn/plugin-helpers';
import { ToolingLog } from '@kbn/dev-utils';

import { generateNoticeFromSource } from '../../src/dev';

import { buildTarget } from './helpers/paths';
import { clean } from './clean';
import { report } from './report';
import { prepare } from './prepare';

async function pluginHelpersBuild() {
  await pluginHelpers.run('build', {
    skipArchive: true,
    buildDestination: buildTarget,
  });
}

async function generateNotice() {
  const buildRoot = resolve(buildTarget, 'kibana/x-pack');
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout
  });

  writeFileSync(
    resolve(buildRoot, 'NOTICE.txt'),
    await generateNoticeFromSource({
      productName: 'Kibana X-Pack',
      log,
      directory: buildRoot
    })
  );
}

export const build = gulp.series(gulp.parallel(clean, report, prepare), pluginHelpersBuild, generateNotice);
