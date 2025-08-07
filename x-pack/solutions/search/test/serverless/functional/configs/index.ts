/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless search UI', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('../test_suites/navigation'));
    loadTestFile(require.resolve('../test_suites/elasticsearch_start.ts'));
    loadTestFile(require.resolve('../test_suites/search_homepage'));
    loadTestFile(require.resolve('../test_suites/search_index_detail.ts'));
    loadTestFile(require.resolve('../test_suites/getting_started'));
    loadTestFile(require.resolve('../test_suites/index_management'));
    loadTestFile(require.resolve('../test_suites/connectors/connectors_overview'));
    loadTestFile(require.resolve('../test_suites/default_dataview'));
    loadTestFile(require.resolve('../test_suites/pipelines'));
    loadTestFile(require.resolve('../test_suites/cases/attachment_framework'));
    loadTestFile(require.resolve('../test_suites/dashboards/build_dashboard'));
    loadTestFile(require.resolve('../test_suites/dashboards/import_dashboard'));
    loadTestFile(require.resolve('../test_suites/advanced_settings'));
    loadTestFile(require.resolve('../test_suites/rules/rule_details'));
    loadTestFile(require.resolve('../test_suites/console_notebooks'));
    loadTestFile(require.resolve('../test_suites/search_playground/playground_overview'));
    loadTestFile(require.resolve('../test_suites/ml'));
    loadTestFile(require.resolve('../test_suites/custom_role_access'));
    loadTestFile(require.resolve('../test_suites/inference_management'));
    loadTestFile(require.resolve('../test_suites/search_query_rules/search_query_rules_overview'));
    loadTestFile(require.resolve('../test_suites/search_synonyms/search_synonyms_overview'));
    loadTestFile(require.resolve('../test_suites/search_synonyms/search_synonym_detail'));
  });
}
