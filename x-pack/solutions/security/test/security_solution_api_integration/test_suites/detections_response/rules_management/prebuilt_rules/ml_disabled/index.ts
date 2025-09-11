/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Rules Management - Prebuilt Rules (ML Disabled)', function () {
    /* Note: some tests below include skips when running in FIPS mode.
     * "ML Disabled" currently assumes a basic license, which does not apply to
     * FIPS, though any passing tests have been preserved.
     * FIPS skips are placed at the lowest possible level to refrain from un-
     * intentional skips, and to retain flexibility, granularity, and coverage.
     * New additions to this index should consider this.
     */
    loadTestFile(require.resolve('./review_installation'));
    loadTestFile(require.resolve('./perform_installation'));
    loadTestFile(require.resolve('./review_upgrade'));
    loadTestFile(require.resolve('./perform_upgrade'));
    loadTestFile(require.resolve('./status'));
  });
};
