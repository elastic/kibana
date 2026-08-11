/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { rootRequest } from './common';

export const createConnector = (connector: Record<string, unknown>) =>
  rootRequest<Connector>({
    method: 'POST',
    url: '/api/actions/connector',
    body: connector,
  });

const emailConnectorAPIPayload = {
  connector_type_id: '.email',
  config: {
    service: '__json',
    from: 'test@example.com',
    hasAuth: false,
  },
  secrets: {},
  name: 'Email cypress test e2e connector',
};

const webhookConnectorAPIPayload = {
  connector_type_id: '.webhook',
  config: {
    method: 'post',
    hasAuth: false,
    authType: null,
    url: 'http://localhost:123',
    headers: {},
  },
  secrets: {
    secretHeaders: {},
  },
  name: 'Webhook cypress test e2e connector',
};

const serverLogConnectorAPIPayload = {
  connector_type_id: '.server-log',
  config: {},
  secrets: {},
  name: 'Server log cypress test e2e connector',
};

export const azureConnectorAPIPayload = {
  connector_type_id: '.gen-ai',
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
  connector_type_id: '.bedrock',
  secrets: {
    accessKey: '123',
    secret: '123',
  },
  config: {
    apiUrl: 'https://bedrock.com',
  },
  name: 'Bedrock cypress test e2e connector',
};

export const createEmailConnector = () => createConnector(emailConnectorAPIPayload);
export const createWebhookConnector = () => createConnector(webhookConnectorAPIPayload);
export const createServerLogConnector = () => createConnector(serverLogConnectorAPIPayload);
export const createAzureConnector = () => createConnector(azureConnectorAPIPayload);
export const createBedrockConnector = () => createConnector(bedrockConnectorAPIPayload);
