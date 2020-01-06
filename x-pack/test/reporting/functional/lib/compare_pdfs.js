/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { PDFImage } from 'pdf-image';
import PDFJS from 'pdfjs-dist';
import { comparePngs } from '../../../../../test/functional/services/lib/compare_pngs';

const mkdirAsync = promisify(fs.mkdir);

export async function checkIfPdfsMatch(actualPdfPath, baselinePdfPath, screenshotsDirectory, log) {
  log.debug(`checkIfPdfsMatch: ${actualPdfPath} vs ${baselinePdfPath}`);
  // Copy the pdfs into the screenshot session directory, as that's where the generated pngs will automatically be
  // stored.
  const sessionDirectoryPath = path.resolve(screenshotsDirectory, 'session');
  const failureDirectoryPath = path.resolve(screenshotsDirectory, 'failure');

  await mkdirAsync(sessionDirectoryPath, { recursive: true });
  await mkdirAsync(failureDirectoryPath, { recursive: true });

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
    fs.writeFileSync(baselineCopyPath, fs.readFileSync(baselinePdfPath));
  } catch (error) {
    log.error(`No baseline pdf found at ${baselinePdfPath}`);
    return 0;
  }
  log.debug(`writeFileSync: ${actualCopyPath}`);
  fs.writeFileSync(actualCopyPath, fs.readFileSync(actualPdfPath));

  const convertOptions = { graphicsMagick: true };

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
    const expectedPagePng = await expectedPdfImage.convertPage(pageNum);
    log.debug(`Converting actual pdf page ${pageNum} to png`);
    const actualPagePng = await actualPdfImage.convertPage(pageNum);
    const diffPngPath = path.resolve(failureDirectoryPath, `${baselinePdfFileName}-${pageNum}.png`);
    diffTotal += await comparePngs(
      actualPagePng,
      expectedPagePng,
      diffPngPath,
      sessionDirectoryPath,
      log
    );
    pageNum++;
  }

  return diffTotal;
}
