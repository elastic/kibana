/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const performance = getService('performance');

  describe('Performance tests', () => {
    loadTestFile(require.resolve('./login'));
    loadTestFile(require.resolve('./ecommerce_dashboard'));
    loadTestFile(require.resolve('./flight_dashboard'));
    loadTestFile(require.resolve('./web_logs_dashboard'));
    loadTestFile(require.resolve('./promotion_tracking_dashboard'));
    loadTestFile(require.resolve('./many_fields_discover'));

    after(async () => {
      await performance.shutdownBrowser();
    });
  });
}
