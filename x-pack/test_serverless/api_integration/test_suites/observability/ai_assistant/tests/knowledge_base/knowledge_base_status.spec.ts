/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  createKnowledgeBaseModel,
  TINY_ELSER,
} from '@kbn/test-suites-xpack/observability_ai_assistant_api_integration/tests/knowledge_base/helpers';
import { deleteKnowledgeBaseModel } from './helpers';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import type { InternalRequestHeader, RoleCredentials } from '../../../../../../shared/services';

export default function ApiTest({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  describe('/internal/observability_ai_assistant/kb/status', function () {
    // TODO: https://github.com/elastic/kibana/issues/192757
    this.tags(['skipMKI']);
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('editor');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await createKnowledgeBaseModel(ml);
      await observabilityAIAssistantAPIClient
        .slsUser({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
          roleAuthc,
          internalReqHeader,
        })
        .expect(200);
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
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
      expect(res.body.deployment_state).to.eql('started');
      expect(res.body.model_name).to.eql(TINY_ELSER.id);
    });

    it('returns correct status after elser is stopped', async () => {
      await ml.api.stopTrainedModelDeploymentES(TINY_ELSER.id, true);

      const res = await observabilityAIAssistantAPIClient
        .slsUser({
          endpoint: 'GET /internal/observability_ai_assistant/kb/status',
          roleAuthc,
          internalReqHeader,
        })
        .expect(200);

      expect(res.body).to.eql({
        ready: false,
        model_name: TINY_ELSER.id,
      });
    });
  });
}
