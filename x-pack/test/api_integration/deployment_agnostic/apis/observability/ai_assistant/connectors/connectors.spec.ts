/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ToolingLog } from '@kbn/tooling-log';
import { Agent } from 'supertest';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
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
      const { status } = await observabilityAIAssistantAPIClient.editor({
        endpoint: `GET ${CONNECTOR_API_URL}`,
      });

      expect(status).to.be(200);
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
  });
}

async function deleteAllActionConnectors(supertest: Agent): Promise<any> {
  const res = await supertest.get(`/api/actions/connectors`);

  const body = res.body as Array<{ id: string; connector_type_id: string; name: string }>;
  return Promise.all(
    body.map(({ id }) => {
      return supertest.delete(`/api/actions/connector/${id}`).set('kbn-xsrf', 'foo');
    })
  );
}

async function deleteActionConnector({
  supertest,
  connectorId,
  log,
}: {
  supertest: Agent;
  connectorId: string;
  log: ToolingLog;
}) {
  try {
    await supertest
      .delete(`/api/actions/connector/${connectorId}`)
      .set('kbn-xsrf', 'foo')
      .expect(204);
  } catch (e) {
    log.error(`Failed to delete action connector with id ${connectorId} due to: ${e}`);
    throw e;
  }
}

async function createProxyActionConnector({
  log,
  supertest,
  port,
}: {
  log: ToolingLog;
  supertest: Agent;
  port: number;
}) {
  try {
    const res = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send({
        name: 'OpenAI Proxy',
        connector_type_id: '.gen-ai',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: `http://localhost:${port}`,
        },
        secrets: {
          apiKey: 'my-api-key',
        },
      })
      .expect(200);

    const connectorId = res.body.id as string;
    return connectorId;
  } catch (e) {
    log.error(`Failed to create action connector due to: ${e}`);
    throw e;
  }
}
