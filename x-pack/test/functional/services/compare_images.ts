/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { pdf } from 'pdf-to-img';
import { comparePngs } from '../../../../test/functional/services/lib/compare_pngs';
import { FtrProviderContext } from '../ftr_provider_context';

export function CompareImagesProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');

  const screenshotsDir = config.get('screenshots.directory');

  const writeToSessionFile = async (name: string, rawPdf: Buffer) => {
    const sessionDirectory = path.resolve(screenshotsDir, 'session');
    await fs.mkdir(sessionDirectory, { recursive: true });
    const sessionReportPath = path.resolve(sessionDirectory, `${name}.png`);
    await fs.writeFile(sessionReportPath, rawPdf);
    return sessionReportPath;
  };

  return {
    writeToSessionFile,
    async checkIfPngsMatch(
      actualPngPath: string,
      baselinePngPath: string,
      screenshotsDirectory: string = screenshotsDir
    ) {
      log.debug(`png.checkIfPngsMatch: ${baselinePngPath}`);
      // Copy the pngs into the screenshot session directory, as that's where the generated pngs will automatically be
      // stored.
      const sessionDirectoryPath = path.resolve(screenshotsDirectory, 'session');
      const failureDirectoryPath = path.resolve(screenshotsDirectory, 'failure');

      await fs.mkdir(sessionDirectoryPath, { recursive: true });
      await fs.mkdir(failureDirectoryPath, { recursive: true });

      const actualPngFileName = path.basename(actualPngPath, '.png');
      const baselinePngFileName = path.basename(baselinePngPath, '.png');

      const baselineCopyPath = path.resolve(
        sessionDirectoryPath,
        `${baselinePngFileName}_baseline.png`
      );
      // Don't cause a test failure if the baseline snapshot doesn't exist - we don't have all OS's covered and we
      // don't want to start causing failures for other devs working on OS's which are lacking snapshots.  We have
      // mac and linux covered which is better than nothing for now.
      try {
        log.debug(`writeFile: ${baselineCopyPath}`);
        await fs.writeFile(baselineCopyPath, await fs.readFile(baselinePngPath));
      } catch (error) {
        throw new Error(`No baseline png found at ${baselinePngPath}`);
      }

      const actualCopyPath = path.resolve(sessionDirectoryPath, `${actualPngFileName}_actual.png`);
      log.debug(`writeFile: ${actualCopyPath}`);
      await fs.writeFile(actualCopyPath, await fs.readFile(actualPngPath));

      let diffTotal = 0;

      const diffPngPath = path.resolve(failureDirectoryPath, `${baselinePngFileName}-${1}.png`);
      diffTotal += await comparePngs(
        actualCopyPath,
        baselineCopyPath,
        diffPngPath,
        sessionDirectoryPath,
        log
      );

      return diffTotal;
    },
    async checkIfPdfsMatch(
      actualPdfPath: string,
      baselinePdfPath: string,
      screenshotsDirectory = screenshotsDir
    ) {
      log.debug(`checkIfPdfsMatch: ${actualPdfPath} vs ${baselinePdfPath}`);
      // Copy the pdfs into the screenshot session directory, as that's where the generated pngs will automatically be
      // stored.
      const sessionDirectoryPath = path.resolve(screenshotsDirectory, 'session');
      const failureDirectoryPath = path.resolve(screenshotsDirectory, 'failure');

      await fs.mkdir(sessionDirectoryPath, { recursive: true });
      await fs.mkdir(failureDirectoryPath, { recursive: true });

      const actualPdfFileName = path.basename(actualPdfPath, '.pdf');
      const baselinePdfFileName = path.basename(baselinePdfPath, '.pdf');

      const baselineCopyPath = path.resolve(
        sessionDirectoryPath,
        `${baselinePdfFileName}_baseline.pdf`
      );
      const actualCopyPath = path.resolve(sessionDirectoryPath, `${actualPdfFileName}_actual.pdf`);

      // Don't cause a test failure if the baseline snapshot doesn't exist - we don't have all OS's covered and we
      // don't want to start causing failures for other devs working on OS's which are lacking snapshots.  We have
      // mac and linux covered which is better than nothing for now.
      try {
        log.debug(`writeFileSync: ${baselineCopyPath}`);
        await fs.writeFile(baselineCopyPath, await fs.readFile(baselinePdfPath));
      } catch (error) {
        log.error(`No baseline pdf found at ${baselinePdfPath}`);
        return 0;
      }
      log.debug(`writeFileSync: ${actualCopyPath}`);
      await fs.writeFile(actualCopyPath, await fs.readFile(actualPdfPath));

      const actualPdf = await pdf(actualCopyPath);
      const baselinePdf = await pdf(actualCopyPath);

      log.debug(`Checking number of pages`);

      if (actualPdf.length !== baselinePdf.length) {
        throw new Error(
          `Expected ${baselinePdf.length} pages but got ${actualPdf.length} in PDFs expected: "${baselineCopyPath}" actual: "${actualCopyPath}".`
        );
      }

      let diffTotal = 0;
      let pageNum = 1;

      for await (const actualPage of actualPdf) {
        for await (const baselinePage of baselinePdf) {
          const diffPngPath = path.resolve(
            failureDirectoryPath,
            `${baselinePdfFileName}-${pageNum}.png`
          );
          diffTotal += await comparePngs(
            { path: screenshotsDirectory, buffer: actualPage },
            { path: screenshotsDirectory, buffer: baselinePage },
            diffPngPath,
            sessionDirectoryPath,
            log
          );
          ++pageNum;
          break;
        }
      }

      return diffTotal;
    },
  };
}
