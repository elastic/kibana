/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { registerMochaHooksForSnapshots } from '../../common/match_snapshot';

export default function observabilityApiIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('APM specs (trial)', function () {
    this.tags('ciGroup1');

    registerMochaHooksForSnapshots();

    describe('Services', function () {
      loadTestFile(require.resolve('./services/annotations'));
      loadTestFile(require.resolve('./services/rum_services.ts'));
      loadTestFile(require.resolve('./services/top_services.ts'));
    });

    describe('Settings', function () {
      describe('Anomaly detection', function () {
        loadTestFile(require.resolve('./settings/anomaly_detection/no_access_user'));
        loadTestFile(require.resolve('./settings/anomaly_detection/read_user'));
        loadTestFile(require.resolve('./settings/anomaly_detection/write_user'));
      });
    });

    describe('Service Maps', function () {
      loadTestFile(require.resolve('./service_maps/service_maps'));
    });
  });
}
