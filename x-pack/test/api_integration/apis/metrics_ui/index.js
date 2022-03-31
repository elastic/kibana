/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('MetricsUI Endpoints', () => {
    loadTestFile(require.resolve('./metadata'));
    loadTestFile(require.resolve('./log_entry_highlights'));
    loadTestFile(require.resolve('./log_summary'));
    loadTestFile(require.resolve('./metrics'));
    loadTestFile(require.resolve('./sources'));
    loadTestFile(require.resolve('./snapshot'));
    loadTestFile(require.resolve('./metrics_alerting'));
    loadTestFile(require.resolve('./metrics_explorer'));
    loadTestFile(require.resolve('./ip_to_hostname'));
    loadTestFile(require.resolve('./http_source'));
    loadTestFile(require.resolve('./metric_threshold_alert'));
    loadTestFile(require.resolve('./metrics_overview_top'));
    loadTestFile(require.resolve('./metrics_process_list'));
    loadTestFile(require.resolve('./metrics_process_list_chart'));
    loadTestFile(require.resolve('./infra_log_analysis_validation_log_entry_datasets'));
    loadTestFile(require.resolve('./inventory_threshold_alert'));
    loadTestFile(require.resolve('./log_threshold_alert'));
  });
}
