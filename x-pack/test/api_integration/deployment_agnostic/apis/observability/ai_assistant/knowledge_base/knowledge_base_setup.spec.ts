/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { TINY_ELSER, deleteKnowledgeBaseModel, setupKnowledgeBase } from '../utils/knowledge_base';
import { restoreIndexAssets } from '../utils/index_assets';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('/internal/observability_ai_assistant/kb/setup', function () {
    before(async () => {
      await deleteKnowledgeBaseModel(getService);
      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
    });

    afterEach(async () => {
      await deleteKnowledgeBaseModel(getService);
      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
    });

    it('returns model info when successful', async () => {
      const res = await setupKnowledgeBase(getService);

      expect(res.body.service_settings.model_id).to.be('pt_tiny_elser');
      expect(res.body.inference_id).to.be('obs_ai_assistant_kb_inference');
    });

    it('returns error message if model is not deployed', async () => {
      const res = await setupKnowledgeBase(getService, { deployModel: false });

      expect(res.status).to.be(500);

      // @ts-expect-error
      expect(res.body.message).to.include.string(
        'No known trained model with model_id [pt_tiny_elser]'
      );

      // @ts-expect-error
      expect(res.body.statusCode).to.be(500);
    });

    describe('security roles and access privileges', () => {
      it('should deny access for users without the ai_assistant privilege', async () => {
        const { status } = await observabilityAIAssistantAPIClient.viewer({
          endpoint: 'POST /internal/observability_ai_assistant/kb/setup',
          params: {
            query: {
              model_id: TINY_ELSER.id,
            },
          },
        });
        expect(status).to.be(403);
      });
    });
  });
}
