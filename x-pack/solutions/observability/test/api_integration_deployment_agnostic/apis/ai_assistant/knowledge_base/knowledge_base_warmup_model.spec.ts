/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  TINY_ELSER_INFERENCE_ID,
  teardownTinyElserModelAndInferenceEndpoint,
  setupTinyElserModelAndInferenceEndpoint,
} from '../utils/model_and_inference';

export default function WarmupModelApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  function warmupKbAsAdmin(inferenceId: string) {
    return observabilityAIAssistantAPIClient.admin({
      endpoint: 'POST /internal/observability_ai_assistant/kb/warmup_model',
      params: {
        query: {
          inference_id: inferenceId,
        },
      },
    });
  }

  function warmupKbAsViewer(inferenceId: string) {
    return observabilityAIAssistantAPIClient.viewer({
      endpoint: 'POST /internal/observability_ai_assistant/kb/warmup_model',
      params: {
        query: {
          inference_id: inferenceId,
        },
      },
    });
  }

  describe('Knowledge base: POST /internal/observability_ai_assistant/kb/warmup_model', function () {
    const inferenceId = TINY_ELSER_INFERENCE_ID;

    before(async () => {
      await setupTinyElserModelAndInferenceEndpoint(getService);
    });

    after(async () => {
      await teardownTinyElserModelAndInferenceEndpoint(getService);
    });

    it('returns 200 and triggers model warmup', async () => {
      const response = await warmupKbAsAdmin(inferenceId);
      expect(response.status).to.be(200);
    });

    it('should deny access for users without the ai_assistant privilege', async () => {
      const response = await warmupKbAsViewer(inferenceId);
      expect(response.status).to.be(403);
    });
  });
}
