/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOpenSourceModel } from './utils';
import { OPENAI_CHAT_URL, OpenAiProviderType } from '@kbn/connector-schemas/openai/constants';
import { InferenceConnectorType } from '@kbn/inference-common';
import type { InferenceConnector } from '@kbn/inference-common';

const baseConnector: Omit<InferenceConnector, 'type' | 'config'> = {
  name: 'test',
  connectorId: 'test-id',
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
};

describe('Utils', () => {
  describe('isOpenSourceModel', () => {
    it('should return `false` when connector is undefined', async () => {
      const isOpenModel = isOpenSourceModel();
      expect(isOpenModel).toEqual(false);
    });

    it('should return `false` when connector is a Bedrock', async () => {
      const connector = { ...baseConnector, type: InferenceConnectorType.Bedrock, config: {} };
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `false` when connector is a Gemini', async () => {
      const connector = { ...baseConnector, type: InferenceConnectorType.Gemini, config: {} };
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `false` when connector is a OpenAI and API url is not specified', async () => {
      const connector = { ...baseConnector, type: InferenceConnectorType.OpenAI, config: {} };
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `false` when connector is a OpenAI and OpenAI API url is specified', async () => {
      const connector = {
        ...baseConnector,
        type: InferenceConnectorType.OpenAI,
        config: { apiUrl: OPENAI_CHAT_URL },
      };
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `false` when connector is a AzureOpenAI', async () => {
      const connector = {
        ...baseConnector,
        type: InferenceConnectorType.OpenAI,
        config: { apiProvider: OpenAiProviderType.AzureAi },
      };
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `true` when connector is a OpenAI and non-OpenAI API url is specified', async () => {
      const connector = {
        ...baseConnector,
        type: InferenceConnectorType.OpenAI,
        config: { apiUrl: 'https://elastic.llm.com/llama/chat/completions' },
      };
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(true);
    });

    it('should return `true` when apiProvider of OpenAiProviderType.Other is specified', async () => {
      const connector = {
        ...baseConnector,
        type: InferenceConnectorType.OpenAI,
        config: { apiUrl: OPENAI_CHAT_URL, apiProvider: OpenAiProviderType.Other },
      };
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(true);
    });

    it('should return `false` when connector is a .inference type with non-openai provider', async () => {
      const connector = {
        ...baseConnector,
        type: InferenceConnectorType.Inference,
        config: { provider: 'bedrock', providerConfig: { model_id: 'claude-3' } },
      };
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `false` when connector is a .inference type with openai provider but no custom URL', async () => {
      const connector = {
        ...baseConnector,
        type: InferenceConnectorType.Inference,
        config: { provider: 'openai', providerConfig: { model_id: 'gpt-4o' } },
      };
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `true` when connector is a .inference type with openai provider and a custom URL', async () => {
      const connector = {
        ...baseConnector,
        type: InferenceConnectorType.Inference,
        config: {
          provider: 'openai',
          providerConfig: { model_id: 'llama3', url: 'https://my-ollama.internal/v1' },
        },
      };
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(true);
    });

    it('should return `false` when connector is a .inference type with openai service (native endpoint) pointing to api.openai.com', async () => {
      const connector = {
        ...baseConnector,
        type: InferenceConnectorType.Inference,
        isInferenceEndpoint: true,
        config: {
          service: 'openai',
          providerConfig: { model_id: 'gpt-4o', url: 'https://api.openai.com/v1' },
        },
      };
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `true` when connector is a .inference native endpoint with openai service and a custom URL', async () => {
      const connector = {
        ...baseConnector,
        type: InferenceConnectorType.Inference,
        isInferenceEndpoint: true,
        config: {
          service: 'openai',
          providerConfig: { model_id: 'llama3', url: 'https://my-ollama.internal/v1' },
        },
      };
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(true);
    });
  });
});
