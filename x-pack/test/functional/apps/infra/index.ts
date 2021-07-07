/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext) => {
  describe('InfraOps App', function () {
    this.tags('ciGroup7');
    loadTestFile(require.resolve('./feature_controls'));
    describe('Metrics UI', function () {
      loadTestFile(require.resolve('./home_page'));
      loadTestFile(require.resolve('./metrics_source_configuration'));
      loadTestFile(require.resolve('./metrics_anomalies'));
    });
    describe('Logs UI', function () {
      loadTestFile(require.resolve('./log_entry_categories_tab'));
      loadTestFile(require.resolve('./log_entry_rate_tab'));
      loadTestFile(require.resolve('./logs_source_configuration'));
      loadTestFile(require.resolve('./link_to'));
    });
  });
};
