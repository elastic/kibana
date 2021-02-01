/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../common/ftr_provider_context';
import { registry } from '../common/registry';

export default function apmApiIntegrationTests(providerContext: FtrProviderContext) {
  const { loadTestFile } = providerContext;

  describe('APM API tests', function () {
    this.tags('ciGroup1');
    loadTestFile(require.resolve('./alerts/chart_preview'));

    loadTestFile(require.resolve('./correlations/slow_transactions'));

    loadTestFile(require.resolve('./csm/csm_services'));
    loadTestFile(require.resolve('./csm/has_rum_data'));
    loadTestFile(require.resolve('./csm/js_errors'));
    loadTestFile(require.resolve('./csm/long_task_metrics'));
    loadTestFile(require.resolve('./csm/page_load_dist'));
    loadTestFile(require.resolve('./csm/page_views'));
    loadTestFile(require.resolve('./csm/url_search'));
    loadTestFile(require.resolve('./csm/web_core_vitals'));

    loadTestFile(require.resolve('./metrics_charts/metrics_charts'));

    loadTestFile(require.resolve('./observability_overview/has_data'));
    loadTestFile(require.resolve('./observability_overview/observability_overview'));

    loadTestFile(require.resolve('./service_maps/service_maps'));

    loadTestFile(require.resolve('./service_overview/dependencies'));
    loadTestFile(require.resolve('./service_overview/error_groups'));
    loadTestFile(require.resolve('./service_overview/instances'));

    loadTestFile(require.resolve('./services/agent_name'));
    loadTestFile(require.resolve('./services/annotations'));
    loadTestFile(require.resolve('./services/service_details'));
    loadTestFile(require.resolve('./services/service_icons'));
    loadTestFile(require.resolve('./services/throughput'));
    loadTestFile(require.resolve('./services/top_services'));
    loadTestFile(require.resolve('./services/transaction_types'));

    loadTestFile(require.resolve('./settings/anomaly_detection/basic'));
    loadTestFile(require.resolve('./settings/anomaly_detection/no_access_user'));
    loadTestFile(require.resolve('./settings/anomaly_detection/read_user'));
    loadTestFile(require.resolve('./settings/anomaly_detection/write_user'));

    loadTestFile(require.resolve('./settings/agent_configuration'));

    loadTestFile(require.resolve('./settings/custom_link'));

    loadTestFile(require.resolve('./traces/top_traces'));

    loadTestFile(require.resolve('./transactions/breakdown'));
    loadTestFile(require.resolve('./transactions/distribution'));
    loadTestFile(require.resolve('./transactions/error_rate'));
    loadTestFile(require.resolve('./transactions/latency'));
    loadTestFile(require.resolve('./transactions/throughput'));
    loadTestFile(require.resolve('./transactions/top_transaction_groups'));
    loadTestFile(require.resolve('./transactions/transactions_groups_overview'));

    loadTestFile(require.resolve('./feature_controls'));

    registry.run(providerContext);
  });
}
