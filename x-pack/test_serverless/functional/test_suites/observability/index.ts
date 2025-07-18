/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless observability UI', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./navigation'));
    loadTestFile(require.resolve('./dataset_quality'));
    loadTestFile(require.resolve('./discover/context_awareness'));
    loadTestFile(require.resolve('./discover/logs'));
    loadTestFile(require.resolve('./discover/embeddables'));
    loadTestFile(require.resolve('./onboarding'));
    loadTestFile(require.resolve('./rules/rules_list'));
    loadTestFile(require.resolve('./rules/custom_threshold_consumer'));
    loadTestFile(require.resolve('./rules/es_query_consumer'));
    loadTestFile(require.resolve('./role_management'));
    loadTestFile(require.resolve('./cases'));
    loadTestFile(require.resolve('./advanced_settings'));
    loadTestFile(require.resolve('./ml'));
  });
}
