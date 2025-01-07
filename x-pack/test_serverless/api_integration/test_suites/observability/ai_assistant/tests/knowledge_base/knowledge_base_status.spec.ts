/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  deleteInferenceEndpoint,
  createKnowledgeBaseModel,
  TINY_ELSER,
  deleteKnowledgeBaseModel,
} from '@kbn/test-suites-xpack/observability_ai_assistant_api_integration/tests/knowledge_base/helpers';
import { AI_ASSISTANT_KB_INFERENCE_ID } from '@kbn/observability-ai-assistant-plugin/server/service/inference_endpoint';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { KNOWLEDGE_BASE_SETUP_API_URL } from './knowledge_base_setup.spec';

const KNOWLEDGE_BASE_STATUS_API_URL = '/internal/observability_ai_assistant/kb/status';

export default function ApiTest({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  describe('/internal/observability_ai_assistant/kb/status', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205677
    this.tags(['failsOnMKI']);

    before(async () => {
      await createKnowledgeBaseModel(ml);
      await observabilityAIAssistantAPIClient
        .slsAdmin({
          endpoint: `POST ${KNOWLEDGE_BASE_SETUP_API_URL}`,
          params: {
            query: {
              model_id: TINY_ELSER.id,
            },
          },
        })
        .expect(200);
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
      await deleteInferenceEndpoint({ es, name: AI_ASSISTANT_KB_INFERENCE_ID }).catch((err) => {});
    });

    it('returns correct status after knowledge base is setup', async () => {
      const res = await observabilityAIAssistantAPIClient
        .slsEditor({
          endpoint: `GET ${KNOWLEDGE_BASE_STATUS_API_URL}`,
        })
        .expect(200);

      expect(res.body.enabled).to.be(true);
      expect(res.body.ready).to.be(true);
      expect(res.body.endpoint?.service_settings?.model_id).to.eql(TINY_ELSER.id);
    });

    it('returns correct status after elser is stopped', async () => {
      await deleteInferenceEndpoint({ es, name: AI_ASSISTANT_KB_INFERENCE_ID });

      const res = await observabilityAIAssistantAPIClient
        .slsEditor({
          endpoint: `GET ${KNOWLEDGE_BASE_STATUS_API_URL}`,
        })
        .expect(200);

      expect(res.body.enabled).to.be(true);
      expect(res.body.ready).to.be(false);
    });

    describe('security roles and access privileges', () => {
      it('should deny access for users without the ai_assistant privilege', async () => {
        await observabilityAIAssistantAPIClient
          .slsUnauthorized({
            endpoint: `GET ${KNOWLEDGE_BASE_STATUS_API_URL}`,
          })
          .expect(403);
      });
    });
  });
}
