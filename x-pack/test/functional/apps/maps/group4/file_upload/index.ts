/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const browser = getService('browser');

  describe('geo file upload', function () {
    before(async () => {
      await browser.setWindowSize(1600, 1000);
    });

    loadTestFile(require.resolve('./wizard'));
    loadTestFile(require.resolve('./geojson'));
    loadTestFile(require.resolve('./shapefile'));
  });
}
