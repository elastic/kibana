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
      loadTestFile(require.resolve('./services/top_services.ts'));
      loadTestFile(require.resolve('./services/transaction_groups_charts'));
    });

    describe('Settings', function () {
      loadTestFile(require.resolve('./settings/custom_link.ts'));
      describe('Anomaly detection', function () {
        loadTestFile(require.resolve('./settings/anomaly_detection/no_access_user'));
        loadTestFile(require.resolve('./settings/anomaly_detection/read_user'));
        loadTestFile(require.resolve('./settings/anomaly_detection/write_user'));
      });
    });

    describe('Service Maps', function () {
      loadTestFile(require.resolve('./service_maps/service_maps'));
    });

    describe('CSM', function () {
      loadTestFile(require.resolve('./csm/csm_services.ts'));
      loadTestFile(require.resolve('./csm/web_core_vitals.ts'));
      loadTestFile(require.resolve('./csm/long_task_metrics.ts'));
      loadTestFile(require.resolve('./csm/url_search.ts'));
      loadTestFile(require.resolve('./csm/page_views.ts'));
      loadTestFile(require.resolve('./csm/js_errors.ts'));
      loadTestFile(require.resolve('./csm/has_rum_data.ts'));
    });
  });
}
