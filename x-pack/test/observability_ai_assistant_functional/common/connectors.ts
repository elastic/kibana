/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent as SuperTestAgent } from 'supertest';
import { LlmProxy } from '../../observability_ai_assistant_api_integration/common/create_llm_proxy';
export async function createConnector(proxy: LlmProxy, supertest: SuperTestAgent) {
  await supertest
    .post('/api/actions/connector')
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'foo',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: `http://localhost:${proxy.getPort()}`,
        defaultModel: 'gpt-4',
      },
      secrets: { apiKey: 'myApiKey' },
      connector_type_id: '.gen-ai',
    })
    .expect(200);
}

export async function deleteConnectors(supertest: SuperTestAgent) {
  const connectors = await supertest.get('/api/actions/connectors').expect(200);
  const promises = connectors.body.map((connector: { id: string }) => {
    return supertest
      .delete(`/api/actions/connector/${connector.id}`)
      .set('kbn-xsrf', 'foo')
      .expect(204);
  });

  return Promise.all(promises);
}
