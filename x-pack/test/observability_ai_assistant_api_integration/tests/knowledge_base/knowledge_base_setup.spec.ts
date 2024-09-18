/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteKnowledgeBaseModel, createKnowledgeBaseModel } from './helpers';

export default function ApiTest({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  describe('/internal/observability_ai_assistant/kb/setup', () => {
    it('returns empty object when successful', async () => {
      await createKnowledgeBaseModel(ml);
      const res = await observabilityAIAssistantAPIClient
        .editorUser({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
        })
        .expect(200);
      expect(res.body).to.eql({});
      await deleteKnowledgeBaseModel(ml);
    });

    it('returns bad request if model cannot be installed', async () => {
      await observabilityAIAssistantAPIClient
        .editorUser({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
        })
        .expect(400);
    });
  });
}
