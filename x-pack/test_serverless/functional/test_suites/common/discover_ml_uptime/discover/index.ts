/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService, loadTestFile }: FtrProviderContext) => {
  const browser = getService('browser');

  describe('Discover alerting', function () {
    before(async function () {
      await browser.setWindowSize(1600, 1200);
    });

    loadTestFile(require.resolve('./search_source_alert'));
  });
};
