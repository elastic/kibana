/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const OBS_AI_ASSISTANT_FEATURE_ID = 'observability_ai_assistant_inference_subfeature';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  describe('List connectors', function () {
    before(async () => {
      await observabilityAIAssistantAPIClient.deleteAllActionConnectors();
      await observabilityAIAssistantAPIClient.clearInferenceSettings();
    });

    after(async () => {
      await observabilityAIAssistantAPIClient.clearInferenceSettings();
      await observabilityAIAssistantAPIClient.deleteAllActionConnectors();
    });

    it('Returns a 2xx for enterprise license', async () => {
      const { status } = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/connectors',
      });

      expect(status).to.be(200);
    });

    it('returns only preconfigured connectors', async () => {
      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/connectors',
      });

      const connectorsExcludingPreconfiguredInference = res.body.filter((c) => !c.isPreconfigured);
      expect(connectorsExcludingPreconfiguredInference.length).to.be(0);
    });

    it('returns a connector that is configured for the feature', async () => {
      const connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: 1234,
      });

      await observabilityAIAssistantAPIClient.configureInferenceSettings({
        featureId: OBS_AI_ASSISTANT_FEATURE_ID,
        connectorId,
      });

      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/connectors',
      });

      const matchingConnectors = res.body.filter((c) => c.connectorId === connectorId);
      expect(matchingConnectors.length).to.be(1);
      expect(matchingConnectors[0].name).to.be('OpenAI Proxy');

      await observabilityAIAssistantAPIClient.clearInferenceSettings();
      await observabilityAIAssistantAPIClient.deleteActionConnector({ actionId: connectorId });
    });

    describe('security roles and access privileges', () => {
      it('should deny access for users without the ai_assistant privilege', async () => {
        const { status } = await observabilityAIAssistantAPIClient.viewer({
          endpoint: `GET /internal/observability_ai_assistant/connectors`,
        });
        expect(status).to.be(403);
      });
    });
  });
}
