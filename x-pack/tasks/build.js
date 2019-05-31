/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { writeFileSync } from 'fs';
import pluginHelpers from '@kbn/plugin-helpers';
import { ToolingLog } from '@kbn/dev-utils';
import { generateNoticeFromSource } from '../../src/dev';

export default (gulp, { buildTarget }) => {
  gulp.task('build', ['clean', 'report', 'prepare:build'], async () => {
    await pluginHelpers.run('build', {
      skipArchive: true,
      buildDestination: buildTarget,
    });

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
  });
};
