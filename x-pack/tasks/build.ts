/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { writeFileSync } from 'fs';
// @ts-ignore
import pluginHelpers from '@kbn/plugin-helpers';
import { ToolingLog } from '@kbn/dev-utils';
import gulp from 'gulp';

// @ts-ignore
import { generateNoticeFromSource } from '../../src/dev';
import { buildTarget } from './helpers/constants';
import { cleanTask } from './clean';
import { reportTask } from './report';
import { prepareTask } from './prepare';

async function pluginHelpersBuild() {
  await pluginHelpers.run('build', {
    skipArchive: true,
    buildDestination: buildTarget,
  });
}

async function generateNoticeText() {
  const buildRoot = resolve(buildTarget, 'kibana/x-pack');
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
  cleanTask,
  reportTask,
  prepareTask,
  pluginHelpersBuild,
  generateNoticeText
);
