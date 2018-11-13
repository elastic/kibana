/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export async function comparePngs(actualPath, expectedPath, diffPath, log) {
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