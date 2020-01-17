/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext) => {
  describe('InfraOps app', function() {
    this.tags('ciGroup7');

    loadTestFile(require.resolve('./home_page'));
    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./log_entry_categories_tab'));
    loadTestFile(require.resolve('./log_entry_rate_tab'));
    loadTestFile(require.resolve('./logs_source_configuration'));
    loadTestFile(require.resolve('./metrics_source_configuration'));
    loadTestFile(require.resolve('./link_to'));
  });
};
