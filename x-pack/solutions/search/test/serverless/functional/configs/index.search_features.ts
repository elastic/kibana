/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless search UI - search features', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('../test_suites/search_index_detail.ts'));
    loadTestFile(require.resolve('../test_suites/connectors/connectors_overview'));
    loadTestFile(require.resolve('../test_suites/search_playground/playground_overview'));
    loadTestFile(require.resolve('../test_suites/search_playground/saved_playgrounds'));
    loadTestFile(require.resolve('../test_suites/inference_management'));
    loadTestFile(require.resolve('../test_suites/search_query_rules/search_query_rules_overview'));
    loadTestFile(require.resolve('../test_suites/search_synonyms/search_synonyms_overview'));
    loadTestFile(require.resolve('../test_suites/search_synonyms/search_synonym_detail'));
    loadTestFile(require.resolve('../test_suites/console_notebooks'));
  });
}
