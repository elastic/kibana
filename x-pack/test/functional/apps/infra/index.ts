/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext) => {
  describe('InfraOps App', function () {
    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./tour'));

    describe('Metrics UI', function () {
      loadTestFile(require.resolve('./home_page'));
      loadTestFile(require.resolve('./metrics_source_configuration'));
      loadTestFile(require.resolve('./metrics_anomalies'));
      loadTestFile(require.resolve('./metrics_explorer'));
      loadTestFile(require.resolve('./hosts_view'));
    });

    describe('Logs UI', function () {
      loadTestFile(require.resolve('./log_entry_categories_tab'));
      loadTestFile(require.resolve('./log_entry_rate_tab'));
      loadTestFile(require.resolve('./logs_source_configuration'));
      loadTestFile(require.resolve('./link_to'));
    });
  });
};
