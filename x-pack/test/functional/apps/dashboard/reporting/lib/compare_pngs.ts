/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { comparePngs } from '../../../../../../../test/functional/services/lib/compare_pngs';

export async function checkIfPngsMatch(
  actualpngPath: string,
  baselinepngPath: string,
  screenshotsDirectory: string,
  log: any
) {
  log.debug(`checkIfpngsMatch: ${actualpngPath} vs ${baselinepngPath}`);
  // Copy the pngs into the screenshot session directory, as that's where the generated pngs will automatically be
  // stored.
  const sessionDirectoryPath = path.resolve(screenshotsDirectory, 'session');
  const failureDirectoryPath = path.resolve(screenshotsDirectory, 'failure');

  await fs.mkdir(sessionDirectoryPath, { recursive: true });
  await fs.mkdir(failureDirectoryPath, { recursive: true });

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
    log.debug(`writeFile: ${baselineCopyPath}`);
    await fs.writeFile(baselineCopyPath, await fs.readFile(baselinepngPath));
  } catch (error) {
    throw new Error(`No baseline png found at ${baselinepngPath}`);
  }
  log.debug(`writeFile: ${actualCopyPath}`);
  await fs.writeFile(actualCopyPath, await fs.readFile(actualpngPath));

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
