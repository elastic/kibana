/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { deleteKnowledgeBaseModel, setupKnowledgeBase } from '../utils/knowledge_base';
import { createOrUpdateIndexAssets } from '../utils/index_assets';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');
  const ml = getService('ml');

  describe('when the knowledge base model changes', function () {
    // Intentionally skipped in all serverless environnments (local and MKI)
    // because the migration scenario being tested is not relevant to MKI and Serverless.
    this.tags(['skipServerless']);

    before(async () => {
      await setupKnowledgeBase(getService);
      // await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
    });

    after(async () => {
      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
      await deleteKnowledgeBaseModel({ ml, es });
    });

    it('cannot add new entries to KB', async () => {
      const { status, body } = await createKnowledgeBaseEntry();

      // @ts-expect-error
      expect(body.message).to.eql(
        'The knowledge base is currently being re-indexed. Please try again later'
      );

      expect(status).to.be(503);
    });
  });

  function createKnowledgeBaseEntry() {
    const knowledgeBaseEntry = {
      id: 'my-doc-id-1',
      title: 'My title',
      text: 'My content',
    };

    return observabilityAIAssistantAPIClient.editor({
      endpoint: 'POST /internal/observability_ai_assistant/kb/entries/save',
      params: { body: knowledgeBaseEntry },
    });
  }
}
