/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  // Config is disabled due to empty test suite
  // Please enable the related config in .buildkite/ftr_vectordb_serverless_configs.yml after adding tests here
  describe('serverless VectorDB UI', function () {
    this.tags(['esGate']);
    // add tests here once vectordb has UI functionality
    // loadTestFile(require.resolve('../test_suites/path/to/tests'));
  });
}
