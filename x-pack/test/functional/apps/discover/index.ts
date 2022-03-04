/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('discover', function () {
    this.tags('ciGroup25');

    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./preserve_url'));
    loadTestFile(require.resolve('./async_scripted_fields'));
    loadTestFile(require.resolve('./reporting'));
    loadTestFile(require.resolve('./error_handling'));
    loadTestFile(require.resolve('./saved_searches'));
    loadTestFile(require.resolve('./visualize_field'));
    loadTestFile(require.resolve('./value_suggestions'));
    loadTestFile(require.resolve('./value_suggestions_non_timebased'));
  });
}
