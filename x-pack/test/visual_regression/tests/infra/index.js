/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile, getService }) {
  const browser = getService('browser');

  describe.skip('InfraUI Visual Regression', function () {
    before(async () => {
      await browser.setWindowSize(1600, 1000);
    });

    this.tags('ciGroup10');
    loadTestFile(require.resolve('./waffle_map'));
    loadTestFile(require.resolve('./saved_views'));
  });
}
