/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  describe('List connectors', function () {
    before(async () => {
      await observabilityAIAssistantAPIClient.deleteAllActionConnectors();
    });

    after(async () => {
      await observabilityAIAssistantAPIClient.deleteAllActionConnectors();
    });

    it('Returns a 2xx for enterprise license', async () => {
      const { status } = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/connectors',
      });

      expect(status).to.be(200);
    });

    it('returns an empty list of connectors', async () => {
      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/connectors',
      });

      const connectorsExcludingPreconfiguredInference = res.body.filter(
        (c) => c.actionTypeId !== '.inference'
      );
      expect(connectorsExcludingPreconfiguredInference.length).to.be(0);
    });

    it("returns the gen ai connector if it's been created", async () => {
      const connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: 1234,
      });

      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: 'GET /internal/observability_ai_assistant/connectors',
      });

      const connectorsExcludingPreconfiguredInference = res.body.filter(
        (c) => c.actionTypeId !== '.inference'
      );
      expect(connectorsExcludingPreconfiguredInference.length).to.be(1);

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
