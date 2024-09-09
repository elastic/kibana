/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteKnowledgeBaseModel, createKnowledgeBaseModel, TINY_ELSER } from './helpers';

export default function ApiTest({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  describe('/internal/observability_ai_assistant/kb/status', () => {
    before(async () => {
      await createKnowledgeBaseModel(ml);
      await observabilityAIAssistantAPIClient
        .editorUser({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
        })
        .expect(200);
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
    });

    it('returns correct status after knowledge base is setup', async () => {
      const res = await observabilityAIAssistantAPIClient
        .editorUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/status',
        })
        .expect(200);
      expect(res.body.deployment_state).to.eql('started');
      expect(res.body.model_name).to.eql(TINY_ELSER.id);
    });

    it('returns correct status after elser is stopped', async () => {
      await ml.api.stopTrainedModelDeploymentES(TINY_ELSER.id, true);

      const res = await observabilityAIAssistantAPIClient
        .editorUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/status',
        })
        .expect(200);

      expect(res.body).to.eql({
        ready: false,
        model_name: TINY_ELSER.id,
      });
    });
  });
}
