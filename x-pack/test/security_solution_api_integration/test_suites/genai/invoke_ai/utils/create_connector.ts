/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { getUrlPrefix } from './space_test_utils';
import { ObjectRemover } from './object_remover';

const connectorSetup = {
  gemini: {
    connectorTypeId: '.gemini',
    name: 'A gemini action',
    secrets: {
      accessKey: 'geminiAccessKey',
      secret: 'geminiSecret',
    },
    config: {
      defaultModel: 'anthropic.claude-v2',
    },
  },
  bedrock: {
    connectorTypeId: '.bedrock',
    name: 'A bedrock action',
    secrets: {
      accessKey: 'bedrockAccessKey',
      secret: 'bedrockSecret',
    },
    config: {
      defaultModel: 'anthropic.claude-v2',
    },
  },
  openai: {
    connectorTypeId: '.gen-ai',
    name: 'An openai action',
    secrets: {
      apiKey: 'genAiApiKey',
    },
    config: {
      apiProvider: 'OpenAI',
    },
  },
};

/**
 * Creates a connector
 * @param supertest The supertest agent.
 * @param apiUrl The url of the api
 * @param connectorType The type of connector to create
 * @param spaceId The space id
 */
export const createConnector = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  objectRemover: ObjectRemover,
  apiUrl: string,
  connectorType: 'bedrock' | 'openai' | 'gemini',
  spaceId?: string
) => {
  const { connectorTypeId, config, name, secrets } = connectorSetup[connectorType];
  const result = await supertest
    .post(`${getUrlPrefix(spaceId ?? 'default')}/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send({
      name,
      connector_type_id: connectorTypeId,
      config: { ...config, apiUrl },
      secrets,
    })
    .expect(200);

  const { body } = result;

  objectRemover.add(spaceId ?? 'default', body.id, 'connector', 'actions');

  return body.id;
};
