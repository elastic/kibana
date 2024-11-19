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
import type { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';

export default function ApiTest({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const es = getService('es');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  describe('/internal/observability_ai_assistant/kb/status', function () {
    this.tags(['skipMKI']);
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await createKnowledgeBaseModel(ml);
      await observabilityAIAssistantAPIClient
        .slsUser({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
          params: {
            query: {
              model_id: TINY_ELSER.id,
            },
          },
          roleAuthc,
          internalReqHeader,
        })
        .expect(200);
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
      await deleteInferenceEndpoint({ es, name: AI_ASSISTANT_KB_INFERENCE_ID }).catch((err) => {});
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('returns correct status after knowledge base is setup', async () => {
      const res = await observabilityAIAssistantAPIClient
        .slsUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/status',
          roleAuthc,
          internalReqHeader,
        })
        .expect(200);

      expect(res.body.enabled).to.be(true);
      expect(res.body.ready).to.be(true);
      expect(res.body.endpoint?.service_settings?.model_id).to.eql(TINY_ELSER.id);
    });

    it('returns correct status after elser is stopped', async () => {
      await deleteInferenceEndpoint({ es, name: AI_ASSISTANT_KB_INFERENCE_ID });

      const res = await observabilityAIAssistantAPIClient
        .slsUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/status',
          roleAuthc,
          internalReqHeader,
        })
        .expect(200);

      expect(res.body.enabled).to.be(true);
      expect(res.body.ready).to.be(false);
    });
  });
}
