/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('performance', function () {
    this.tags('ciGroup8');
    const { TEST_RUNNER } = process.env;

    if (TEST_RUNNER === 'FTR') {
      loadTestFile(require.resolve('./home'));
    } else if (TEST_RUNNER === 'SYNTHETICS') {
      loadTestFile(require.resolve('./home.synthetics'));
    }
  });
}
