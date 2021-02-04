/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('dashboard', function () {
    this.tags('ciGroup7');

    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./preserve_url'));
    loadTestFile(require.resolve('./reporting'));
    loadTestFile(require.resolve('./drilldowns'));
    loadTestFile(require.resolve('./sync_colors'));
    loadTestFile(require.resolve('./_async_dashboard'));
    loadTestFile(require.resolve('./dashboard_lens_by_value'));
  });
}
