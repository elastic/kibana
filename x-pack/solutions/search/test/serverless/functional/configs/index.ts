/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless search UI', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('../test_suites/navigation'));
    loadTestFile(require.resolve('../test_suites/index_management'));
    loadTestFile(require.resolve('../test_suites/default_dataview'));
    loadTestFile(require.resolve('../test_suites/pipelines'));
    loadTestFile(require.resolve('../test_suites/cases/attachment_framework'));
    loadTestFile(require.resolve('../test_suites/dashboards/build_dashboard'));
  });
}
