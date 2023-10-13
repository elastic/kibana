/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Infra UI', function () {
    // all these tests are failing on MKI:
    // Error: expected 200 "OK", got 404 "Not Found"
    this.tags(['failsOnMKI']);

    loadTestFile(require.resolve('./metadata'));
    loadTestFile(require.resolve('./snapshot'));
    loadTestFile(require.resolve('./processes'));
    loadTestFile(require.resolve('./infra'));
  });
}
