/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable import/no-default-export */

import type { FtrProviderContext } from './ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Search solution FF tests', function () {
    // Shared test file to close the global solution tour
    loadTestFile(require.resolve('./apps/shared/solution_tour'));
    // add tests that require feature flags, defined in config.feature_flags.ts
  });
};
