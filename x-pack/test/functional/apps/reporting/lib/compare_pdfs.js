/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import fs from 'fs';
import { promisify } from 'bluebird';
import pixelmatch from 'pixelmatch';
import mkdirp from 'mkdirp';

import { PNG } from 'pngjs';
import { PDFImage } from 'pdf-image';

const mkdirAsync = promisify(mkdirp);
const writeFileAsync = promisify(fs.writeFile);

function comparePngs(actualPath, expectedPath, diffPath, log) {
  log.debug(`comparePngs: ${actualPath} vs ${expectedPath}`);
  return new Promise(resolve => {
    const actual = fs.createReadStream(actualPath).pipe(new PNG()).on('parsed', doneReading);
    const expected = fs.createReadStream(expectedPath).pipe(new PNG()).on('parsed', doneReading);
    let filesRead = 0;

    function doneReading() {
      if (++filesRead < 2) return;
      const diffPng = new PNG({ width: actual.width, height: actual.height });
      log.debug(`calculating diff pixels...`);
      const diffPixels = pixelmatch(
        actual.data,
        expected.data,
        diffPng.data,
        actual.width,
        actual.height,
        { threshold: 0.9 }
      );
      log.debug(`diff pixels: ${diffPixels}`);
      diffPng.pack().pipe(fs.createWriteStream(diffPath));
      resolve(diffPixels);
    }
  });
}

export async function checkIfPdfsMatch(actualPdfPath, baselinePdfPath, screenshotsDirectory, log) {
  log.debug(`checkIfPdfsMatch: ${actualPdfPath} vs ${baselinePdfPath}`);
  // Copy the pdfs into the screenshot session directory, as that's where the generated pngs will automatically be
  // stored.
  const sessionDirectoryPath = path.resolve(screenshotsDirectory, 'session');
  const failureDirectoryPath = path.resolve(screenshotsDirectory, 'failure');

  await mkdirAsync(sessionDirectoryPath);
  await mkdirAsync(failureDirectoryPath);

  const actualPdfFileName = path.basename(actualPdfPath, '.pdf');
  const baselinePdfFileName = path.basename(baselinePdfPath, '.pdf');

  const baselineCopyPath = path.resolve(sessionDirectoryPath, `${baselinePdfFileName}_baseline.pdf`);
  const actualCopyPath = path.resolve(sessionDirectoryPath, `${actualPdfFileName}_actual.pdf`);

  // Don't cause a test failure if the baseline snapshot doesn't exist - we don't have all OS's covered and we
  // don't want to start causing failures for other devs working on OS's which are lacking snapshots.  We have
  // mac and linux covered which is better than nothing for now.
  try {
    await writeFileAsync(baselineCopyPath, fs.readFileSync(baselinePdfPath));
  } catch (error) {
    log.error(`No baseline pdf found at ${baselinePdfPath}`);
    return 0;
  }
  await writeFileAsync(actualCopyPath, fs.readFileSync(actualPdfPath));

  const convertOptions = {
    '-density': '300',
  };
  const actualPdfImage = new PDFImage(actualCopyPath, { convertOptions });
  const expectedPdfImage = new PDFImage(baselineCopyPath, { convertOptions });

  let pageNum = 0;
  let diffTotal = 0;
  while (true) {
    let expectedPagePng;
    try {
      expectedPagePng = await expectedPdfImage.convertPage(pageNum);
    } catch (e) {
      if (JSON.stringify(e).indexOf('Requested FirstPage is greater than the number of pages in the file') >= 0) {
        break;
      } else {
        log.error('PDF to image conversion failed. Make sure you have the required dependencies ' +
                  'imagemagick, ghostscript and poppler installed.');
        throw e;
      }
    }

    const actualPagePng = await actualPdfImage.convertPage(pageNum);

    const diffPngPath = path.resolve(failureDirectoryPath, `${baselinePdfFileName}-${pageNum}.png`);

    diffTotal += await comparePngs(actualPagePng, expectedPagePng, diffPngPath, log);
    pageNum++;
  }
  return diffTotal;
}

