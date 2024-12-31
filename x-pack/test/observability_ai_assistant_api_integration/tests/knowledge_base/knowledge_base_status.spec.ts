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

  const KNOWLEDGE_BASE_STATUS_API_URL = '/internal/observability_ai_assistant/kb/status';

  describe('/internal/observability_ai_assistant/kb/status', () => {
    beforeEach(async () => {
      await createKnowledgeBaseModel(ml);
      await observabilityAIAssistantAPIClient
        .admin({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
          params: {
            query: {
              model_id: TINY_ELSER.id,
            },
          },
        })
        .expect(200);
    });

    afterEach(async () => {
      await deleteKnowledgeBaseModel(ml).catch((e) => {});
      await deleteInferenceEndpoint({ es }).catch((e) => {});
    });

    it('returns correct status after knowledge base is setup', async () => {
      const res = await observabilityAIAssistantAPIClient
        .editor({ endpoint: `GET ${KNOWLEDGE_BASE_STATUS_API_URL}` })
        .expect(200);

      expect(res.body.ready).to.be(true);
      expect(res.body.enabled).to.be(true);
      expect(res.body.endpoint?.service_settings?.model_id).to.eql(TINY_ELSER.id);
    });

    it('returns correct status after model is deleted', async () => {
      await deleteKnowledgeBaseModel(ml);

      const res = await observabilityAIAssistantAPIClient
        .editor({
          endpoint: `GET ${KNOWLEDGE_BASE_STATUS_API_URL}`,
        })
        .expect(200);

      expect(res.body.ready).to.be(false);
      expect(res.body.enabled).to.be(true);
      expect(res.body.errorMessage).to.include.string(
        'No known trained model with model_id [pt_tiny_elser]'
      );
    });

    it('returns correct status after inference endpoint is deleted', async () => {
      await deleteInferenceEndpoint({ es });

      const res = await observabilityAIAssistantAPIClient
        .editor({
          endpoint: `GET ${KNOWLEDGE_BASE_STATUS_API_URL}`,
        })
        .expect(200);

      expect(res.body.ready).to.be(false);
      expect(res.body.enabled).to.be(true);
      expect(res.body.errorMessage).to.include.string(
        'Inference endpoint not found [obs_ai_assistant_kb_inference]'
      );
    });

    describe('security roles and access privileges', () => {
      it('should deny access for users without the ai_assistant privilege', async () => {
        try {
          await observabilityAIAssistantAPIClient.unauthorizedUser({
            endpoint: `GET ${KNOWLEDGE_BASE_STATUS_API_URL}`,
          });
          throw new ForbiddenApiError('Expected unauthorizedUser() to throw a 403 Forbidden error');
        } catch (e) {
          expect(e.status).to.be(403);
        }
      });
    });
  });
}
