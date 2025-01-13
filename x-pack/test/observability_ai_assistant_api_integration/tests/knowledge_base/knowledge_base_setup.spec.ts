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
import { ForbiddenApiError } from '../../common/config';

export default function ApiTest({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  const KNOWLEDGE_BASE_SETUP_API_URL = '/internal/observability_ai_assistant/kb/setup';

  describe('/internal/observability_ai_assistant/kb/setup', () => {
    it('returns model info when successful', async () => {
      await createKnowledgeBaseModel(ml);
      const res = await observabilityAIAssistantAPIClient
        .admin({
          endpoint: `POST ${KNOWLEDGE_BASE_SETUP_API_URL}`,
          params: {
            query: {
              model_id: TINY_ELSER.id,
            },
          },
        })
        .expect(200);

      expect(res.body.service_settings.model_id).to.be('pt_tiny_elser');
      expect(res.body.inference_id).to.be('obs_ai_assistant_kb_inference');

      await deleteKnowledgeBaseModel(ml);
      await deleteInferenceEndpoint({ es });
    });

    it('returns error message if model is not deployed', async () => {
      const res = await observabilityAIAssistantAPIClient
        .admin({
          endpoint: `POST ${KNOWLEDGE_BASE_SETUP_API_URL}`,
          params: {
            query: {
              model_id: TINY_ELSER.id,
            },
          },
        })
        .expect(500);

      // @ts-expect-error
      expect(res.body.message).to.include.string(
        'No known trained model with model_id [pt_tiny_elser]'
      );

      // @ts-expect-error
      expect(res.body.statusCode).to.be(500);
    });

    describe('security roles and access privileges', () => {
      it('should deny access for users without the ai_assistant privilege', async () => {
        try {
          await observabilityAIAssistantAPIClient.unauthorizedUser({
            endpoint: `POST ${KNOWLEDGE_BASE_SETUP_API_URL}`,
            params: {
              query: {
                model_id: TINY_ELSER.id,
              },
            },
          });
          throw new ForbiddenApiError('Expected unauthorizedUser() to throw a 403 Forbidden error');
        } catch (e) {
          expect(e.status).to.be(403);
        }
      });
    });
  });
}
