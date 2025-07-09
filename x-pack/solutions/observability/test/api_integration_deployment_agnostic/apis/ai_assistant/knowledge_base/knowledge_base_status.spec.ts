/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/common';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  teardownTinyElserModelAndInferenceEndpoint,
  deleteInferenceEndpoint,
  deployTinyElserAndSetupKb,
  TINY_ELSER_MODEL_ID,
  TINY_ELSER_INFERENCE_ID,
  deleteModel,
  stopTinyElserModel,
} from '../utils/model_and_inference';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('Knowledge base: GET /internal/observability_ai_assistant/kb/status', function () {
    it('returns correct status before knowledge base is setup', async () => {
      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/kb/status',
      });

      expect(res.status).to.be(200);

      expect(res.body.kbState).to.be(KnowledgeBaseState.NOT_INSTALLED);
      expect(res.body.enabled).to.be(true);
    });

    describe('after the knowledge base has been set up', () => {
      before(async () => {
        await deployTinyElserAndSetupKb(getService);
      });

      after(async () => {
        await teardownTinyElserModelAndInferenceEndpoint(getService);
      });

      it('returns the correct status when the knowledge base is successfully installed', async () => {
        const res = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/kb/status',
        });

        expect(res.status).to.be(200);

        expect(res.body.kbState).to.be(KnowledgeBaseState.READY);
        expect(res.body.enabled).to.be(true);
        expect(res.body.endpoint?.service_settings?.model_id).to.eql(TINY_ELSER_MODEL_ID);
      });

      it('returns MODEL_PENDING_DEPLOYMENT status after the model deployment is stopped', async () => {
        await stopTinyElserModel(getService);

        const res = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/kb/status',
        });

        expect(res.status).to.be(200);
        expect(res.body.kbState).to.be(KnowledgeBaseState.MODEL_PENDING_DEPLOYMENT);
      });

      it('returns the correct status after the model is deleted', async () => {
        await deleteModel(getService, { modelId: TINY_ELSER_MODEL_ID });

        const res = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/kb/status',
        });

        expect(res.status).to.be(200);

        expect(res.body.kbState).to.be(KnowledgeBaseState.NOT_INSTALLED);
        expect(res.body.enabled).to.be(true);
        expect(res.body.errorMessage).to.include.string(
          'No known trained model with model_id [pt_tiny_elser]'
        );
      });

      it('returns the correct status after inference endpoint is deleted', async () => {
        await deleteInferenceEndpoint(getService, { inferenceId: TINY_ELSER_INFERENCE_ID });

        const res = await observabilityAIAssistantAPIClient.editor({
          endpoint: 'GET /internal/observability_ai_assistant/kb/status',
        });

        expect(res.status).to.be(200);

        expect(res.body.kbState).to.be(KnowledgeBaseState.NOT_INSTALLED);
        expect(res.body.enabled).to.be(true);
        expect(res.body.errorMessage).to.include.string(
          'Inference endpoint not found [pt_tiny_elser_inference_id]'
        );
      });
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
