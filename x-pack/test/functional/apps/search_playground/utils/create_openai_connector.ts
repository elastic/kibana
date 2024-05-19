/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

export async function createOpenAIConnector({
  supertest,
  requestHeader = {},
  apiKeyHeader = {},
}: {
  supertest: SuperTest.Agent;
  requestHeader?: Record<string, string>;
  apiKeyHeader?: Record<string, string>;
}): Promise<() => Promise<void>> {
  const config = {
    apiProvider: 'OpenAI',
    defaultModel: 'gpt-4',
    apiUrl: 'http://localhost:3002',
  };

  const connector: { id: string } | undefined = (
    await supertest
      .post('/api/actions/connector')
      .set(requestHeader)
      .set(apiKeyHeader)
      .send({
        name: 'test Open AI',
        connector_type_id: '.gen-ai',
        config,
        secrets: {
          apiKey: 'genAiApiKey',
        },
      })
      .expect(200)
  ).body;

  return async () => {
    if (connector) {
      await supertest
        .delete(`/api/actions/connector/${connector.id}`)
        .set(requestHeader)
        .set(apiKeyHeader)
        .expect(204);
    }
  };
}
