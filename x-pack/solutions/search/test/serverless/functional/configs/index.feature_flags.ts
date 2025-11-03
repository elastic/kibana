/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless search UI - feature flags', function () {
    // This test needs to run first to avoid other tests setting the local
    // storage key which this test file relies on
    loadTestFile(require.resolve('../test_suites/search_getting_started'));
    // add tests that require feature flags, defined in config.feature_flags.ts
    loadTestFile(require.resolve('../test_suites/agent_builder'));
    loadTestFile(require.resolve('../test_suites/search_playground/search_relevance'));
  });
}
