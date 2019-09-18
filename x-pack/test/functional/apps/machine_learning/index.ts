/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ loadTestFile }: FtrProviderContext) {
  describe('machine learning', function() {
    this.tags('ciGroup3');

    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./pages'));
    loadTestFile(require.resolve('./create_single_metric_job'));
    loadTestFile(require.resolve('./create_multi_metric_job'));
    loadTestFile(require.resolve('./create_population_job'));
  });
}
