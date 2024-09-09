/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile }: any) {
  describe('Observability Rules', () => {
    describe('Rules Endpoints', () => {
      loadTestFile(require.resolve('./metric_threshold_rule'));
      loadTestFile(require.resolve('./custom_threshold_rule/avg_pct_fired'));
      loadTestFile(require.resolve('./custom_threshold_rule/p99_pct_fired'));
      loadTestFile(require.resolve('./custom_threshold_rule/rate_bytes_fired'));
      loadTestFile(require.resolve('./custom_threshold_rule/avg_pct_no_data'));
      loadTestFile(require.resolve('./custom_threshold_rule/avg_us_fired'));
      loadTestFile(require.resolve('./custom_threshold_rule/custom_eq_avg_bytes_fired'));
      loadTestFile(require.resolve('./custom_threshold_rule/documents_count_fired'));
      loadTestFile(require.resolve('./custom_threshold_rule/group_by_fired'));
      loadTestFile(require.resolve('./custom_threshold_rule_data_view'));
    });
    describe('Synthetics', () => {
      loadTestFile(require.resolve('./synthetics_rule'));
    });
  });
}
