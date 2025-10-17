/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless observability UI - Cases and Rules', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('../test_suites/rules/rules_list'));
    loadTestFile(require.resolve('../test_suites/rules/custom_threshold_consumer'));
    loadTestFile(require.resolve('../test_suites/rules/es_query_consumer'));
    loadTestFile(require.resolve('../test_suites/cases'));
  });
}
