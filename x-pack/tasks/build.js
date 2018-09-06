/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { resolve } = require('path');
const { writeFileSync } = require('fs');
const pluginHelpers = require('@kbn/plugin-helpers');
const { ToolingLog } = require('@kbn/dev-utils');
const { generateNoticeFromSource } = require('../../src/dev');

module.exports = (gulp, { buildTarget }) => {
  gulp.task('build', ['clean', 'report', 'prepare'], async () => {
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
