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
import PDFJS from 'pdfjs-dist';

const mkdirAsync = promisify(mkdirp);

async function convertPageToImage(pdfImage, pageNum, log) {
  // For some reason the library seems to randomly throw "Failed to convert page to image" errors that are
  // resolved on a retry. We've taken this code out before and just start hitting the error again in our
  // ci.
  let failCount = 0;
  while (true) {
    try {
      return await pdfImage.convertPage(pageNum);
    } catch (error) {
      log.error(`Error caught while converting pdf page ${pageNum} to png: ${error.message}`);
      if (failCount < 3) {
        log.error(`${failCount}: Will try conversion again...`);
        failCount++;
        continue;
      } else {
        log.error(`Failed ${failCount} times, throwing error`);
        throw error;
      }
    }
  }
}

function comparePngs(actualPath, expectedPath, diffPath, log) {
  log.debug(`comparePngs: ${actualPath} vs ${expectedPath}`);
  return new Promise(resolve => {
    const actual = fs.createReadStream(actualPath).pipe(new PNG()).on('parsed', doneReading);
    const expected = fs.createReadStream(expectedPath).pipe(new PNG()).on('parsed', doneReading);
    let filesRead = 0;

    // Note that this threshold value only affects color comparison from pixel to pixel. It won't have
    // any affect when comparing neighboring pixels - so slight shifts, font variations, or "blurry-ness"
    // will still show up as diffs, but upping this will not help that.  Instead we keep the threshold low, and expect
    // some the diffCount to be lower than our own threshold value.
    const THRESHOLD = .1;

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
        {
          threshold: THRESHOLD,
          // Adding this doesn't seem to make a difference at all, but ideally we want to avoid picking up anti aliasing
          // differences from fonts on different OSs.
          includeAA: true
        }
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
    log.debug(`writeFileSync: ${baselineCopyPath}`);
    fs.writeFileSync(baselineCopyPath, fs.readFileSync(baselinePdfPath));
  } catch (error) {
    log.error(`No baseline pdf found at ${baselinePdfPath}`);
    return 0;
  }
  log.debug(`writeFileSync: ${actualCopyPath}`);
  fs.writeFileSync(actualCopyPath, fs.readFileSync(actualPdfPath));

  const convertOptions = {
    '-density': '300',
  };
  const actualPdfImage = new PDFImage(actualCopyPath, { convertOptions });
  const expectedPdfImage = new PDFImage(baselineCopyPath, { convertOptions });

  log.debug(`Calculating numberOfPages`);

  const actualDoc = await PDFJS.getDocument(actualCopyPath);
  const expectedDoc = await PDFJS.getDocument(baselineCopyPath);
  const actualPages = actualDoc.numPages;
  const expectedPages = expectedDoc.numPages;

  if (actualPages !== expectedPages) {
    throw new Error(
      `Expected ${expectedPages} pages but got ${actualPages} in PDFs expected: "${baselineCopyPath}" actual: "${actualCopyPath}".`
    );
  }

  let diffTotal = 0;

  for (let pageNum = 0; pageNum <= expectedPages; ++pageNum) {
    log.debug(`Converting expected pdf page ${pageNum} to png`);
    const expectedPagePng = await convertPageToImage(expectedPdfImage, pageNum, log);
    log.debug(`Converting actual pdf page ${pageNum} to png`);
    const actualPagePng = await convertPageToImage(actualPdfImage, pageNum, log);
    const diffPngPath = path.resolve(failureDirectoryPath, `${baselinePdfFileName}-${pageNum}.png`);
    diffTotal += await comparePngs(actualPagePng, expectedPagePng, diffPngPath, log);
    pageNum++;
  }

  return diffTotal;
}
