/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function apmApiIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('APM specs (basic)', function () {
    this.tags('ciGroup1');

    // feature_controls
    loadTestFile(require.resolve('./feature_controls'));

    // service_maps
    loadTestFile(require.resolve('./service_maps/service_maps'));

    // services
    loadTestFile(require.resolve('./services/'));

    // settings
    loadTestFile(require.resolve('./settings/'));

    // traces
    loadTestFile(require.resolve('./traces/'));

    // transaction_group
    loadTestFile(require.resolve('./transaction_groups/'));
  });
}
