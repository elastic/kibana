/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { getInferenceEndpointOnlyConnectorId } from '../utils/get_chat_completion_inference_endpoint';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('inference endpoint connector resolution', function () {
    let inferenceEndpointId: string;

    before(async function () {
      const endpointId = await getInferenceEndpointOnlyConnectorId(getService);
      if (!endpointId) {
        this.skip();
      }
      inferenceEndpointId = endpointId!;
    });

    it('resolves inference endpoint IDs via GET /connectors/{connectorId}', async () => {
      const { status, body } = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/connectors/{connectorId}',
        params: {
          path: {
            connectorId: inferenceEndpointId,
          },
        },
      });

      expect(status).to.be(200);
      expect(body.connectorId).to.be(inferenceEndpointId);
      expect(body.isInferenceEndpoint).to.be(true);
    });

    it('resolves inference endpoint IDs for chat recall (KB context path)', async () => {
      const { status, body } = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'POST /internal/observability_ai_assistant/chat/recall',
        params: {
          body: {
            connectorId: inferenceEndpointId,
            screenDescription: 'User is investigating a service outage.',
            scopes: ['observability'],
            messages: [
              {
                '@timestamp': new Date().toISOString(),
                message: {
                  role: MessageRole.User,
                  content: 'What should I check first?',
                },
              },
            ],
          },
        },
      });

      expect(status).to.not.be(404);
      expect(String(body)).to.not.contain('No connector or inference endpoint found');
    });
  });
}
