/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { rootRequest } from './common';

export const createConnector = (connector: Record<string, unknown>) =>
  rootRequest<Connector>({
    method: 'POST',
    url: '/api/actions/action',
    body: connector,
  });

const slackConnectorAPIPayload = {
  actionTypeId: '.slack',
  secrets: {
    webhookUrl: 'http://localhost:123',
  },
  name: 'Slack cypress test e2e connector',
};

export const azureConnectorAPIPayload = {
  actionTypeId: '.gen-ai',
  secrets: {
    apiKey: '123',
  },
  config: {
    apiUrl:
      'https://goodurl.com/openai/deployments/good-gpt4o/chat/completions?api-version=2024-02-15-preview',
    apiProvider: 'Azure OpenAI',
  },
  name: 'Azure OpenAI cypress test e2e connector',
};

export const bedrockConnectorAPIPayload = {
  actionTypeId: '.bedrock',
  secrets: {
    accessKey: '123',
    secret: '123',
  },
  config: {
    apiUrl: 'https://bedrock.com',
  },
  name: 'Bedrock cypress test e2e connector',
};

export const createSlackConnector = () => createConnector(slackConnectorAPIPayload);
export const createAzureConnector = () => createConnector(azureConnectorAPIPayload);
export const createBedrockConnector = () => createConnector(bedrockConnectorAPIPayload);
