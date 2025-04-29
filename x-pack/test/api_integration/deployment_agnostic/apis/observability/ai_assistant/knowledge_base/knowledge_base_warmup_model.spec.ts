/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  importTinyElserModel,
  createTinyElserInferenceEndpoint,
  deleteInferenceEndpoint,
  deleteTinyElserModel,
  TINY_ELSER_INFERENCE_ID,
} from '../utils/knowledge_base';

export default function WarmupModelApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const ml = getService('ml');
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

  describe('/internal/observability_ai_assistant/kb/warmup_model', function () {
    const inferenceId = TINY_ELSER_INFERENCE_ID;

    before(async () => {
      await importTinyElserModel(ml);
      await createTinyElserInferenceEndpoint({ es, log, inferenceId });
    });

    after(async () => {
      await deleteTinyElserModel(getService);
      await deleteInferenceEndpoint({ es, log, inferenceId });
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
