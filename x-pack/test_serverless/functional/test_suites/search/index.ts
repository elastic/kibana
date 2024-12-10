/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless search UI', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./navigation'));
    loadTestFile(require.resolve('./elasticsearch_start.ts'));
    loadTestFile(require.resolve('./search_index_detail.ts'));
    loadTestFile(require.resolve('./getting_started'));
    loadTestFile(require.resolve('./index_management'));
    loadTestFile(require.resolve('./connectors/connectors_overview'));
    loadTestFile(require.resolve('./default_dataview'));
    loadTestFile(require.resolve('./pipelines'));
    loadTestFile(require.resolve('./cases/attachment_framework'));
    loadTestFile(require.resolve('./dashboards/build_dashboard'));
    loadTestFile(require.resolve('./dashboards/import_dashboard'));
    loadTestFile(require.resolve('./advanced_settings'));
    loadTestFile(require.resolve('./rules/rule_details'));
    loadTestFile(require.resolve('./console_notebooks'));
    loadTestFile(require.resolve('./search_playground/playground_overview'));
    loadTestFile(require.resolve('./ml'));
    loadTestFile(require.resolve('./custom_role_access'));
    loadTestFile(require.resolve('./inference_management'));
  });
}
