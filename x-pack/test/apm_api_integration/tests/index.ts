/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../common/ftr_provider_context';
import { registry } from '../common/registry';

export default function apmApiIntegrationTests(providerContext: FtrProviderContext) {
  const { loadTestFile } = providerContext;

  describe('APM API tests', function () {
    this.tags('ciGroup1');

    // inspect feature
    describe('inspect/inspect', function () {
      loadTestFile(require.resolve('./inspect/inspect'));
    });

    // alerts
    describe('alerts/chart_preview', function () {
      loadTestFile(require.resolve('./alerts/chart_preview'));
    });

    describe('alerts/rule_registry', function () {
      loadTestFile(require.resolve('./alerts/rule_registry'));
    });

    describe('correlations/latency_slow_transactions', function () {
      loadTestFile(require.resolve('./correlations/latency_slow_transactions'));
    });

    describe('correlations/latency_ml', function () {
      loadTestFile(require.resolve('./correlations/latency_ml'));
    });

    describe('correlations/latency_overall', function () {
      loadTestFile(require.resolve('./correlations/latency_overall'));
    });

    describe('correlations/errors_overall', function () {
      loadTestFile(require.resolve('./correlations/errors_overall'));
    });

    describe('correlations/errors_failed_transactions', function () {
      loadTestFile(require.resolve('./correlations/errors_failed_transactions'));
    });

    describe('metrics_charts/metrics_charts', function () {
      loadTestFile(require.resolve('./metrics_charts/metrics_charts'));
    });

    describe('observability_overview/has_data', function () {
      loadTestFile(require.resolve('./observability_overview/has_data'));
    });

    describe('observability_overview/observability_overview', function () {
      loadTestFile(require.resolve('./observability_overview/observability_overview'));
    });

    describe('service_maps/service_maps', function () {
      loadTestFile(require.resolve('./service_maps/service_maps'));
    });

    // Service overview
    describe('service_overview/dependencies', function () {
      loadTestFile(require.resolve('./service_overview/dependencies'));
    });

    describe('service_overview/instances_main_statistics', function () {
      loadTestFile(require.resolve('./service_overview/instances_main_statistics'));
    });

    describe('service_overview/instances_detailed_statistics', function () {
      loadTestFile(require.resolve('./service_overview/instances_detailed_statistics'));
    });

    describe('service_overview/instance_details', function () {
      loadTestFile(require.resolve('./service_overview/instance_details'));
    });

    // Services
    describe('services/agent_name', function () {
      loadTestFile(require.resolve('./services/agent_name'));
    });

    describe('services/annotations', function () {
      loadTestFile(require.resolve('./services/annotations'));
      loadTestFile(require.resolve('./services/derived_annotations'));
    });

    describe('services/service_details', function () {
      loadTestFile(require.resolve('./services/service_details'));
    });

    describe('services/service_icons', function () {
      loadTestFile(require.resolve('./services/service_icons'));
    });

    describe('services/throughput', function () {
      loadTestFile(require.resolve('./services/throughput'));
    });

    describe('services/top_services', function () {
      loadTestFile(require.resolve('./services/top_services'));
    });

    describe('services/transaction_types', function () {
      loadTestFile(require.resolve('./services/transaction_types'));
    });

    describe('services/error_groups_main_statistics', function () {
      loadTestFile(require.resolve('./services/error_groups_main_statistics'));
    });

    describe('services/error_groups_detailed_statistics', function () {
      loadTestFile(require.resolve('./services/error_groups_detailed_statistics'));
    });

    describe('services/detailed_statistics', function () {
      loadTestFile(require.resolve('./services/services_detailed_statistics'));
    });

    // Settinges
    describe('settings/anomaly_detection/basic', function () {
      loadTestFile(require.resolve('./settings/anomaly_detection/basic'));
    });

    describe('settings/anomaly_detection/no_access_user', function () {
      loadTestFile(require.resolve('./settings/anomaly_detection/no_access_user'));
    });

    describe('settings/anomaly_detection/read_user', function () {
      loadTestFile(require.resolve('./settings/anomaly_detection/read_user'));
    });

    describe('settings/anomaly_detection/write_user', function () {
      loadTestFile(require.resolve('./settings/anomaly_detection/write_user'));
    });

    describe('settings/agent_configuration', function () {
      loadTestFile(require.resolve('./settings/agent_configuration'));
    });

    describe('settings/custom_link', function () {
      loadTestFile(require.resolve('./settings/custom_link'));
    });

    // traces
    describe('traces/top_traces', function () {
      loadTestFile(require.resolve('./traces/top_traces'));
    });

    // transactions
    describe('transactions/breakdown', function () {
      loadTestFile(require.resolve('./transactions/breakdown'));
    });

    describe('transactions/distribution', function () {
      loadTestFile(require.resolve('./transactions/distribution'));
    });

    describe('transactions/error_rate', function () {
      loadTestFile(require.resolve('./transactions/error_rate'));
    });

    describe('transactions/latency', function () {
      loadTestFile(require.resolve('./transactions/latency'));
    });

    describe('transactions/transactions_groups_main_statistics', function () {
      loadTestFile(require.resolve('./transactions/transactions_groups_main_statistics'));
    });

    describe('transactions/transactions_groups_detailed_statistics', function () {
      loadTestFile(require.resolve('./transactions/transactions_groups_detailed_statistics'));
    });

    // feature control
    describe('feature_controls', function () {
      loadTestFile(require.resolve('./feature_controls'));
    });

    // CSM
    describe('csm/csm_services', function () {
      loadTestFile(require.resolve('./csm/csm_services'));
    });

    describe('csm/has_rum_data', function () {
      loadTestFile(require.resolve('./csm/has_rum_data'));
    });

    describe('csm/js_errors', function () {
      loadTestFile(require.resolve('./csm/js_errors'));
    });

    describe('csm/long_task_metrics', function () {
      loadTestFile(require.resolve('./csm/long_task_metrics'));
    });

    describe('csm/page_load_dist', function () {
      loadTestFile(require.resolve('./csm/page_load_dist'));
    });

    describe('csm/page_views', function () {
      loadTestFile(require.resolve('./csm/page_views'));
    });

    describe('csm/url_search', function () {
      loadTestFile(require.resolve('./csm/url_search'));
    });

    describe('csm/web_core_vitals', function () {
      loadTestFile(require.resolve('./csm/web_core_vitals'));
    });

    registry.run(providerContext);
  });
}
