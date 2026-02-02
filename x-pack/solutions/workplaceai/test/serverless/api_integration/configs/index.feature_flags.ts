/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  // Config is disabled due to empty test suite
  // Please enable the related config in .buildkite/ftr_workplace_ai_serverless_configs.yml after adding tests here
  describe('Serverless Workplace AI API - feature flags', function () {
    // loadTestFile(require.resolve('./path/to/tests'));
  });
}
