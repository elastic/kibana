/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('data frame analytics', function () {
    this.tags(['mlqa', 'skipFirefox']);

    loadTestFile(require.resolve('./outlier_detection_creation'));
    loadTestFile(require.resolve('./regression_creation'));
    loadTestFile(require.resolve('./classification_creation'));
    loadTestFile(require.resolve('./cloning'));
    loadTestFile(require.resolve('./results_view_content'));
    loadTestFile(require.resolve('./regression_creation_saved_search'));
    loadTestFile(require.resolve('./classification_creation_saved_search'));
    loadTestFile(require.resolve('./outlier_detection_creation_saved_search'));
  });
}
