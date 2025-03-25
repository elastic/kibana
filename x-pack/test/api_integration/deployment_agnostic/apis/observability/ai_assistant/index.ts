/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function aiAssistantApiIntegrationTests({
  loadTestFile,
}: DeploymentAgnosticFtrProviderContext) {
  describe('observability AI Assistant', function () {
    loadTestFile(require.resolve('./conversations/conversations.spec.ts'));
    loadTestFile(require.resolve('./connectors/connectors.spec.ts'));
    loadTestFile(require.resolve('./chat/chat.spec.ts'));
    loadTestFile(require.resolve('./complete/complete.spec.ts'));
    loadTestFile(require.resolve('./complete/functions/alerts.spec.ts'));
    loadTestFile(require.resolve('./complete/functions/get_alerts_dataset_info.spec.ts'));
    loadTestFile(require.resolve('./complete/functions/get_dataset_info.spec.ts'));
    loadTestFile(require.resolve('./complete/functions/execute_query.spec.ts'));
    loadTestFile(require.resolve('./complete/functions/elasticsearch.spec.ts'));
    loadTestFile(require.resolve('./complete/functions/retrieve_elastic_doc.spec.ts'));
    loadTestFile(require.resolve('./complete/functions/summarize.spec.ts'));
    loadTestFile(require.resolve('./complete/functions/recall.spec.ts'));
    loadTestFile(require.resolve('./public_complete/public_complete.spec.ts'));
    loadTestFile(require.resolve('./knowledge_base/knowledge_base_setup.spec.ts'));
    loadTestFile(
      require.resolve('./knowledge_base/knowledge_base_add_semantic_text_field_migration.spec.ts')
    );
    loadTestFile(require.resolve('./knowledge_base/knowledge_base_reindex.spec.ts'));
    loadTestFile(require.resolve('./knowledge_base/knowledge_base_status.spec.ts'));
    loadTestFile(require.resolve('./knowledge_base/knowledge_base.spec.ts'));
    loadTestFile(require.resolve('./knowledge_base/knowledge_base_user_instructions.spec.ts'));
  });
}
