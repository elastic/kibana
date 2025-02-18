/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless search UI - feature flags', function () {
    // add tests that require feature flags, defined in config.feature_flags.ts
    loadTestFile(require.resolve('./search_synonyms/search_synonyms_overview'));
  });
}
