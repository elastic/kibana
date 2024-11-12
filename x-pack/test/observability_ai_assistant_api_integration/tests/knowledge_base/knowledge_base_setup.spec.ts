/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  deleteKnowledgeBaseModel,
  createKnowledgeBaseModel,
  TINY_ELSER,
  deleteInferenceEndpoint,
} from './helpers';

export default function ApiTest({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  describe('/internal/observability_ai_assistant/kb/setup', () => {
    it('returns model info when successful', async () => {
      await createKnowledgeBaseModel(ml);
      const res = await observabilityAIAssistantAPIClient
        .admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
          params: {
            query: {
              model_id: TINY_ELSER.id,
            },
          },
        })
        .expect(200);

      expect(res.body).to.eql({
        inference_id: 'ai_assistant_kb_inference',
        task_type: 'sparse_embedding',
        service: 'elasticsearch',
        service_settings: { num_allocations: 1, num_threads: 1, model_id: 'pt_tiny_elser' },
        chunking_settings: { strategy: 'sentence', max_chunk_size: 250, sentence_overlap: 1 },
      });

      await deleteKnowledgeBaseModel(ml);
      await deleteInferenceEndpoint({ es });
    });

    it('returns error message if model is not deployed', async () => {
      const res = await observabilityAIAssistantAPIClient
        .admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
          params: {
            query: {
              model_id: TINY_ELSER.id,
            },
          },
        })
        .expect(500);

      expect(res.body.message).to.include.string(
        'No known trained model with model_id [pt_tiny_elser]'
      );
      expect(res.body.statusCode).to.be(500);
    });
  });
}
