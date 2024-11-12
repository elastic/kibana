/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  createKnowledgeBaseModel,
  deleteInferenceEndpoint,
  TINY_ELSER,
  deleteKnowledgeBaseModel,
} from '@kbn/test-suites-xpack/observability_ai_assistant_api_integration/tests/knowledge_base/helpers';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';

export default function ApiTest({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const es = getService('es');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  describe('/internal/observability_ai_assistant/kb/setup', function () {
    this.tags(['skipMKI']);
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;

    before(async () => {
      await deleteKnowledgeBaseModel(ml).catch(() => {});
      await deleteInferenceEndpoint({ es }).catch(() => {});

      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });

    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('returns empty object when successful', async () => {
      await createKnowledgeBaseModel(ml);
      const res = await observabilityAIAssistantAPIClient
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

    it('returns bad request if model cannot be installed', async () => {
      const res = await observabilityAIAssistantAPIClient
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
        .expect(500);

      expect(res.body.message).to.include.string(
        'No known trained model with model_id [pt_tiny_elser]'
      );
    });
  });
}
