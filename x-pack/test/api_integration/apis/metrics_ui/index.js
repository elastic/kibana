/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('MetricsUI Endpoints', () => {
    loadTestFile(require.resolve('./metadata'));
    loadTestFile(require.resolve('./log_analysis'));
    loadTestFile(require.resolve('./log_entries'));
    loadTestFile(require.resolve('./log_entry_highlights'));
    loadTestFile(require.resolve('./logs_without_millis'));
    loadTestFile(require.resolve('./log_sources'));
    loadTestFile(require.resolve('./log_summary'));
    loadTestFile(require.resolve('./metrics'));
    loadTestFile(require.resolve('./sources'));
    loadTestFile(require.resolve('./snapshot'));
    loadTestFile(require.resolve('./log_item'));
    loadTestFile(require.resolve('./metrics_alerting'));
    loadTestFile(require.resolve('./metrics_explorer'));
    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./ip_to_hostname'));
    loadTestFile(require.resolve('./http_source'));
  });
}
