/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import del from 'del';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import pluginHelpers from '@kbn/plugin-helpers';
import { ToolingLog } from '@kbn/dev-utils';
import { generateNoticeFromSource } from '../../src/dev';

async function moveFiles(gulp, src, dest) {
  return new Promise((resolve, reject) => {
    gulp.src(src)
      .pipe(gulp.dest(dest))
      .on('finish', resolve)
      .on('error', reject);
  });
}

export default (gulp, { buildTarget }) => {
  gulp.task('build', ['clean', 'report', 'prepare:build'], async () => {
    const buildRoot = resolve(buildTarget, 'kibana/x-pack');
    await pluginHelpers.run('build', {
      skipArchive: true,
      buildDestination: buildTarget,
    });

    // NOTE: In order to prevent ending up with transpiled js files
    // in the repository, we have set the outDir on x-pack tsconfig file
    // to be the same as the intermediateBuildDirectory defined on the package.json
    // As result of it, we need to move the transpiled js files for the correct folder
    // and in the end deleting the generated outDir from the intermediateBuildDirectory.
    //
    //# TODO: This might be able to go away as soon as we upgrade the x-pack build to use babel7
    await moveFiles(
      gulp,
      resolve(buildRoot, 'x-pack/build/plugin/kibana/x-pack/**/!(*.test).js'),
      buildRoot
    );
    await del(resolve(buildRoot, 'x-pack'));
    //#

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
