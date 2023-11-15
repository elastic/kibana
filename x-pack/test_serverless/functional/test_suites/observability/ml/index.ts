/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Observability ML', function () {
    // Error: Failed to delete all indices with pattern [.ml-*]
    // Error: First result should be Machine Learning (got matching items 'undefined')
    this.tags(['failsOnMKI']);
    loadTestFile(require.resolve('./anomaly_detection_jobs_list'));
    loadTestFile(require.resolve('./search_bar_features'));
  });
}
