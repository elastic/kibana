/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import fs from 'fs';
import { promisify } from 'bluebird';
import { comparePngs } from '../../../../../test/functional/services/lib/compare_pngs';

const mkdirAsync = promisify(fs.mkdir);

export async function checkIfPngsMatch(actualpngPath, baselinepngPath, screenshotsDirectory, log) {
  log.debug(`checkIfpngsMatch: ${actualpngPath} vs ${baselinepngPath}`);
  // Copy the pngs into the screenshot session directory, as that's where the generated pngs will automatically be
  // stored.
  const sessionDirectoryPath = path.resolve(screenshotsDirectory, 'session');
  const failureDirectoryPath = path.resolve(screenshotsDirectory, 'failure');

  await mkdirAsync(sessionDirectoryPath, { recursive: true });
  await mkdirAsync(failureDirectoryPath, { recursive: true });

  const actualpngFileName = path.basename(actualpngPath, '.png');
  const baselinepngFileName = path.basename(baselinepngPath, '.png');

  const baselineCopyPath = path.resolve(
    sessionDirectoryPath,
    `${baselinepngFileName}_baseline.png`
  );
  const actualCopyPath = path.resolve(sessionDirectoryPath, `${actualpngFileName}_actual.png`);

  // Don't cause a test failure if the baseline snapshot doesn't exist - we don't have all OS's covered and we
  // don't want to start causing failures for other devs working on OS's which are lacking snapshots.  We have
  // mac and linux covered which is better than nothing for now.
  try {
    log.debug(`writeFileSync: ${baselineCopyPath}`);
    fs.writeFileSync(baselineCopyPath, fs.readFileSync(baselinepngPath));
  } catch (error) {
    log.error(`No baseline png found at ${baselinepngPath}`);
    return 0;
  }
  log.debug(`writeFileSync: ${actualCopyPath}`);
  fs.writeFileSync(actualCopyPath, fs.readFileSync(actualpngPath));

  let diffTotal = 0;

  const diffPngPath = path.resolve(failureDirectoryPath, `${baselinepngFileName}-${1}.png`);
  diffTotal += await comparePngs(
    actualCopyPath,
    baselineCopyPath,
    diffPngPath,
    sessionDirectoryPath,
    log
  );

  return diffTotal;
}
