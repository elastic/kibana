/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function apmApiIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('APM specs (basic)', function () {
    this.tags('ciGroup1');

    loadTestFile(require.resolve('./annotations'));
    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./agent_configuration'));
    loadTestFile(require.resolve('./custom_link'));
    loadTestFile(require.resolve('./service_maps'));

    // traces
    loadTestFile(require.resolve('./traces/top_traces'));

    // services
    loadTestFile(require.resolve('./services/top_services'));

    // services/transaction
    loadTestFile(require.resolve('./services/transactions/top_transaction_groups'));
    loadTestFile(require.resolve('./services/transactions/transaction_charts'));
    loadTestFile(require.resolve('./services/transactions/agent_name'));
    loadTestFile(require.resolve('./services/transactions/transaction_types'));
  });
}
