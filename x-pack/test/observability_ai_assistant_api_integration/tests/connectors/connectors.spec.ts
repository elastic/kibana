/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const supertest = getService('supertest');

  describe('List connectors', () => {
    it('Returns a 2xx for enterprise license', async () => {
      await observabilityAIAssistantAPIClient
        .readUser({
          endpoint: 'GET /internal/observability_ai_assistant/connectors',
        })
        .expect(200);
    });

    it('returns an empty list of connectors', async () => {
      const res = await observabilityAIAssistantAPIClient.readUser({
        endpoint: 'GET /internal/observability_ai_assistant/connectors',
      });

      expect(res.body.length).to.be(0);
    });

    it("returns the gen ai connector if it's been created", async () => {
      const connectorCreateResponse = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OpenAI',
          connector_type_id: '.gen-ai',
          config: {
            apiProvider: 'OpenAI',
            apiUrl: 'http://localhost:9200',
          },
          secrets: {
            apiKey: 'my-api-key',
          },
        })
        .expect(200);

      const res = await observabilityAIAssistantAPIClient.readUser({
        endpoint: 'GET /internal/observability_ai_assistant/connectors',
      });

      expect(res.body.length).to.be(1);

      const connectorId = connectorCreateResponse.body.id;

      await supertest
        .delete(`/api/actions/connector/${connectorId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204);
    });
  });
}
