/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_OPTIONS } from '../../../../../test/visual_regression/services/visual_testing/visual_testing';

const [SCREEN_WIDTH] = DEFAULT_OPTIONS.widths || [];

export default function ({ loadTestFile, getService }) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');

  describe('canvas app visual regression', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.load('x-pack/test/functional/es_archives/canvas/default');

      await browser.setWindowSize(SCREEN_WIDTH, 1000);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/canvas/default');
    });

    this.tags('ciGroup10');
    loadTestFile(require.resolve('./fullscreen'));
  });
}
