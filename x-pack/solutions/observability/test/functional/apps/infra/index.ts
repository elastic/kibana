/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext) => {
  describe('InfraOps App', function () {
    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./page_not_found'));
    loadTestFile(require.resolve('./rules'));

    describe('Metrics UI', function () {
      loadTestFile(require.resolve('./metrics_anomalies'));
      loadTestFile(require.resolve('./metrics_explorer'));
      loadTestFile(require.resolve('./hosts_view'));
    });
  });
};
