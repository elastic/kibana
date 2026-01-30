/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless observability UI', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('../test_suites/navigation'));
    loadTestFile(require.resolve('../test_suites/dataset_quality'));
    loadTestFile(require.resolve('../test_suites/role_management'));
    loadTestFile(require.resolve('../test_suites/advanced_settings'));
    loadTestFile(require.resolve('../test_suites/privileges'));
  });
}
