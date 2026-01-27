/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Serverless observability API', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('../test_suites/apm_api_integration/feature_flags.ts'));
    loadTestFile(require.resolve('../test_suites/cases'));
    loadTestFile(require.resolve('../test_suites/synthetics'));
    loadTestFile(require.resolve('../test_suites/platform_security'));
  });
}
