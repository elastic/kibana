/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function visualize({ loadTestFile }: FtrProviderContext) {
  describe('Visualize', function visualizeTestSuite() {
    this.tags(['ciGroup4', 'skipFirefox']);

    // loadTestFile(require.resolve('./feature_controls/visualize_security'));
    loadTestFile(require.resolve('./feature_controls/visualize_spaces'));
    // loadTestFile(require.resolve('./hybrid_visualization'));
    // loadTestFile(require.resolve('./precalculated_histogram'));
    // loadTestFile(require.resolve('./preserve_url'));
    // loadTestFile(require.resolve('./reporting'));
  });
}
