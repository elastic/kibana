/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAISimulator } from '@kbn/actions-simulators-plugin/server/openai_simulation';
import { Config } from '@kbn/test';
import type SuperTest from 'supertest';

export async function* createOpenAIConnector({
  configService,
  supertest,
  requestHeader = {},
  apiKeyHeader = {},
}: {
  configService: Config;
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  requestHeader?: Record<string, string>;
  apiKeyHeader?: Record<string, string>;
}): AsyncGenerator<() => Promise<void>> {
  const simulator = new OpenAISimulator({
    returnError: false,
    proxy: {
      config: configService.get('kbnTestServer.serverArgs'),
    },
  });

  const config = {
    apiProvider: 'OpenAI',
    defaultModel: 'gpt-4',
    apiUrl: await simulator.start(),
  };
  // eslint-disable-next-line prefer-const
  let connector: { id: string } | undefined;

  yield async () => {
    if (connector) {
      await supertest
        .delete(`/api/actions/connector/${connector.id}`)
        .set(requestHeader)
        .set(apiKeyHeader)
        .expect(204);
    }

    await simulator.close();
  };

  connector = (
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
}
