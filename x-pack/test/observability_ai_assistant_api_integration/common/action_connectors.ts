/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Agent } from 'supertest';

export async function deleteActionConnector({
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

export async function createProxyActionConnector({
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
