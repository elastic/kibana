/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  deleteKnowledgeBaseModel,
  importTinyElserModel,
  TINY_ELSER,
  deleteInferenceEndpoint,
  setupKnowledgeBase,
} from './helpers';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const ml = getService('ml');
  const es = getService('es');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('/internal/observability_ai_assistant/kb/setup', function () {
    before(async () => {
      await deleteKnowledgeBaseModel(ml).catch(() => {});
      await deleteInferenceEndpoint({ es }).catch(() => {});
    });

    it('returns model info when successful', async () => {
      await importTinyElserModel(ml);
      const res = await setupKnowledgeBase(observabilityAIAssistantAPIClient);

      expect(res.body.service_settings.model_id).to.be('pt_tiny_elser');
      expect(res.body.inference_id).to.be('obs_ai_assistant_kb_inference');

      await deleteKnowledgeBaseModel(ml);
      await deleteInferenceEndpoint({ es });
    });

    it('returns error message if model is not deployed', async () => {
      const res = await setupKnowledgeBase(observabilityAIAssistantAPIClient);
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
