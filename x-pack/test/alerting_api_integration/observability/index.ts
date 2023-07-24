/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile }: any) {
  describe('Observability Rules', () => {
    describe('MetricsUI Endpoints', () => {
      loadTestFile(require.resolve('./metric_threshold_rule'));
      loadTestFile(require.resolve('./threshold_rule'));
      loadTestFile(require.resolve('./threshold_rule_data_view'));
    });

    describe('Synthetics', () => {
      loadTestFile(require.resolve('./synthetics_rule'));
    });
  });
}
