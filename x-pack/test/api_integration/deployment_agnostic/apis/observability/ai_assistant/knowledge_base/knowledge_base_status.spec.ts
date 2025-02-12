/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AI_ASSISTANT_KB_INFERENCE_ID } from '@kbn/observability-ai-assistant-plugin/server/service/inference_endpoint';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  deleteKnowledgeBaseModel,
  importTinyElserModel,
  TINY_ELSER,
  deleteInferenceEndpoint,
  setupKnowledgeBase,
  waitForKnowledgeBaseReady,
} from './helpers';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const ml = getService('ml');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('/internal/observability_ai_assistant/kb/status', function () {
    beforeEach(async () => {
      await importTinyElserModel(ml);
      await setupKnowledgeBase(observabilityAIAssistantAPIClient);
      await waitForKnowledgeBaseReady({ observabilityAIAssistantAPIClient, log, retry });
    });

    afterEach(async () => {
      await deleteKnowledgeBaseModel(ml).catch((e) => {});
      await deleteInferenceEndpoint({ es, name: AI_ASSISTANT_KB_INFERENCE_ID }).catch((err) => {});
    });

    it('returns correct status after knowledge base is setup', async () => {
      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/kb/status',
      });

      expect(res.status).to.be(200);

      expect(res.body.ready).to.be(true);
      expect(res.body.enabled).to.be(true);
      expect(res.body.endpoint?.service_settings?.model_id).to.eql(TINY_ELSER.id);
    });

    it('returns correct status after model is deleted', async () => {
      await deleteKnowledgeBaseModel(ml);

      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/kb/status',
      });

      expect(res.status).to.be(200);

      expect(res.body.ready).to.be(false);
      expect(res.body.enabled).to.be(true);
      expect(res.body.errorMessage).to.include.string(
        'No known trained model with model_id [pt_tiny_elser]'
      );
    });

    it('returns correct status after inference endpoint is deleted', async () => {
      await deleteInferenceEndpoint({ es });

      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/kb/status',
      });

      expect(res.status).to.be(200);

      expect(res.body.ready).to.be(false);
      expect(res.body.enabled).to.be(true);
      expect(res.body.errorMessage).to.include.string(
        'Inference endpoint not found [obs_ai_assistant_kb_inference]'
      );
    });

    it('returns correct status after elser is stopped', async () => {
      await deleteInferenceEndpoint({ es, name: AI_ASSISTANT_KB_INFERENCE_ID });

      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/kb/status',
      });

      expect(res.status).to.be(200);

      expect(res.body.enabled).to.be(true);
      expect(res.body.ready).to.be(false);
    });

    describe('security roles and access privileges', () => {
      it('should deny access for users without the ai_assistant privilege', async () => {
        const { status } = await observabilityAIAssistantAPIClient.viewer({
          endpoint: 'GET /internal/observability_ai_assistant/kb/status',
        });
        expect(status).to.be(403);
      });
    });
  });
}
