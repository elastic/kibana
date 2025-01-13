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
import { ForbiddenApiError } from '../../common/config';

export default function ApiTest({ getService }: FtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');
  const supertest = getService('supertest');
  const log = getService('log');

  const CONNECTOR_API_URL = '/internal/observability_ai_assistant/connectors';

  describe('List connectors', () => {
    before(async () => {
      await deleteAllActionConnectors(supertest);
    });

    after(async () => {
      await deleteAllActionConnectors(supertest);
    });

    it('Returns a 2xx for enterprise license', async () => {
      await observabilityAIAssistantAPIClient
        .editor({
          endpoint: `GET ${CONNECTOR_API_URL}`,
        })
        .expect(200);
    });

    it('returns an empty list of connectors', async () => {
      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: `GET ${CONNECTOR_API_URL}`,
      });

      expect(res.body.length).to.be(0);
    });

    it("returns the gen ai connector if it's been created", async () => {
      const connectorId = await createProxyActionConnector({ supertest, log, port: 1234 });

      const res = await observabilityAIAssistantAPIClient.editor({
        endpoint: `GET ${CONNECTOR_API_URL}`,
      });

      expect(res.body.length).to.be(1);

      await deleteActionConnector({ supertest, connectorId, log });
    });

    describe('security roles and access privileges', () => {
      it('should deny access for users without the ai_assistant privilege', async () => {
        try {
          await observabilityAIAssistantAPIClient.unauthorizedUser({
            endpoint: `GET ${CONNECTOR_API_URL}`,
          });
          throw new ForbiddenApiError('Expected unauthorizedUser() to throw a 403 Forbidden error');
        } catch (e) {
          expect(e.status).to.be(403);
        }
      });
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
