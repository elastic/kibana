/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Execution context', function () {
    this.tags('ciGroup1');
    loadTestFile(require.resolve('./browser'));
    loadTestFile(require.resolve('./server'));
    loadTestFile(require.resolve('./log_correlation'));
  });
}
