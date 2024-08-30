/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Agent as SuperTestAgent } from 'supertest';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createProxyActionConnector, deleteActionConnector } from '../../common/action_connectors';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('List connectors', () => {
    before(async () => {
      await deleteAllActionConnectors(supertest);
    });

    after(async () => {
      await deleteAllActionConnectors(supertest);
    });

    it('Returns a 2xx for enterprise license', async () => {
      await observabilityAIAssistantAPIClient
        .editorUser({
          endpoint: 'GET /internal/observability_ai_assistant/connectors',
        })
        .expect(200);
    });

    it('returns an empty list of connectors', async () => {
      const res = await observabilityAIAssistantAPIClient.editorUser({
        endpoint: 'GET /internal/observability_ai_assistant/connectors',
      });

      expect(res.body.length).to.be(0);
    });

    it("returns the gen ai connector if it's been created", async () => {
      const connectorId = await createProxyActionConnector({ supertest, log, port: 1234 });

      const res = await observabilityAIAssistantAPIClient.editorUser({
        endpoint: 'GET /internal/observability_ai_assistant/connectors',
      });

      expect(res.body.length).to.be(1);

      await deleteActionConnector({ supertest, connectorId, log });
    });
  });
}

export async function deleteAllActionConnectors(supertest: SuperTestAgent): Promise<any> {
  const res = await supertest.get(`/api/actions/connectors`);

  const body = res.body as Array<{ id: string; connector_type_id: string; name: string }>;
  return Promise.all(
    body.map(({ id }) => {
      return supertest.delete(`/api/actions/connector/${id}`).set('kbn-xsrf', 'foo');
    })
  );
}
