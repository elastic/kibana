/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrompt, getPromptsByGroupId } from './get_prompt';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { localPrompts, promptDictionary, promptGroupId } from './mock_prompts';

jest.mock('@kbn/core-saved-objects-api-server');

const bedrockConnector = {
  type: '.bedrock' as const,
  name: 'Bedrock',
  connectorId: 'connector-123',
  config: { defaultModel: 'us.anthropic.claude-3-5-sonnet-20240620-v1:0' },
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
};

const openaiConnector = {
  type: '.gen-ai' as const,
  name: 'OpenAI',
  connectorId: 'connector-123',
  config: { defaultModel: 'gpt-4o' },
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
};

const inferenceBedrockConnector = {
  type: '.inference' as const,
  name: 'Inference Bedrock',
  connectorId: 'connector-123',
  config: {
    provider: 'bedrock',
    providerConfig: { model_id: 'us.anthropic.claude-3-5-sonnet-20240620-v1:0' },
  },
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
};

const inferenceElasticConnector = {
  type: '.inference' as const,
  name: 'Inference Elastic',
  connectorId: 'connector-123',
  config: { provider: 'elastic', providerConfig: { model_id: 'rainbow-sprinkles' } },
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
};

const inferenceElasticUnknownConnector = {
  type: '.inference' as const,
  name: 'Inference Elastic Unknown',
  connectorId: 'connector-123',
  config: { provider: 'elastic', providerConfig: { model_id: 'unknown-model' } },
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
};

const inferenceEndpointAmazonBedrock = {
  type: '.inference' as const,
  name: 'my-endpoint',
  connectorId: 'my-bedrock-endpoint',
  config: {
    service: 'amazonbedrock',
    providerConfig: { model_id: 'us.anthropic.claude-3-5-sonnet-20240620-v1:0' },
  },
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: false,
};

const geminiConnector = {
  type: '.gemini' as const,
  name: 'Gemini',
  connectorId: 'connector-123',
  config: { defaultModel: 'gemini-1.5-pro-002' },
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
};

const inferenceElasticConnectorRainbow = {
  type: '.inference' as const,
  name: 'Inference Elastic Rainbow',
  connectorId: 'connector-123',
  config: { provider: 'elastic', providerConfig: { model_id: 'rainbow-sprinkles' } },
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
};

describe('get_prompt', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        page: 1,
        per_page: 20,
        total: 3,
        saved_objects: [
          {
            type: 'security-ai-prompt',
            id: '977b39b8-5bb9-4530-9a39-7aa7084fb5c0',
            attributes: {
              promptId: promptDictionary.systemPrompt,
              promptGroupId: promptGroupId.aiAssistant,
              provider: 'openai',
              model: 'gpt-4o',
              description: 'Default prompt for AI Assistant system prompt.',
              prompt: {
                default: 'Hello world this is a system prompt',
              },
            },
            references: [],
            managed: false,
            updated_at: '2025-01-22T18:44:35.271Z',
            updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            created_at: '2025-01-22T18:44:35.271Z',
            created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            version: 'Wzk0MiwxXQ==',
            coreMigrationVersion: '8.8.0',
            score: 0.13353139,
          },
          {
            type: 'security-ai-prompt',
            id: 'd6dacb9b-1029-4c4c-85e1-e4f97b31c7f4',
            attributes: {
              promptId: promptDictionary.systemPrompt,
              promptGroupId: promptGroupId.aiAssistant,
              provider: 'openai',
              description: 'Default prompt for AI Assistant system prompt.',
              prompt: {
                default: 'Hello world this is a system prompt no model',
              },
            },
            references: [],
            managed: false,
            updated_at: '2025-01-22T19:11:48.806Z',
            updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            created_at: '2025-01-22T19:11:48.806Z',
            created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            version: 'Wzk4MCwxXQ==',
            coreMigrationVersion: '8.8.0',
            score: 0.13353139,
          },
          {
            type: 'security-ai-prompt',
            id: 'd6dacb9b-1029-4c4c-85e1-e4f97b31c7f4',
            attributes: {
              promptId: promptDictionary.systemPrompt,
              promptGroupId: promptGroupId.aiAssistant,
              provider: 'bedrock',
              description: 'Default prompt for AI Assistant system prompt.',
              prompt: {
                default: 'Hello world this is a system prompt for bedrock',
              },
            },
            references: [],
            managed: false,
            updated_at: '2025-01-22T19:11:48.806Z',
            updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            created_at: '2025-01-22T19:11:48.806Z',
            created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            version: 'Wzk4MCwxXQ==',
            coreMigrationVersion: '8.8.0',
            score: 0.13353139,
          },
          {
            type: 'security-ai-prompt',
            id: 'd6dacb9b-1029-4c4c-85e1-e4f97b31c7f4',
            attributes: {
              promptId: promptDictionary.systemPrompt,
              promptGroupId: promptGroupId.aiAssistant,
              provider: 'bedrock',
              model: 'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
              description: 'Default prompt for AI Assistant system prompt.',
              prompt: {
                default: 'Hello world this is a system prompt for bedrock claude-3-5-sonnet',
              },
            },
            references: [],
            managed: false,
            updated_at: '2025-01-22T19:11:48.806Z',
            updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            created_at: '2025-01-22T19:11:48.806Z',
            created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            version: 'Wzk4MCwxXQ==',
            coreMigrationVersion: '8.8.0',
            score: 0.13353139,
          },
          {
            type: 'security-ai-prompt',
            id: 'k6dacb9b-1029-4c4c-85e1-e4f97b31c7f4',
            attributes: {
              promptId: promptDictionary.systemPrompt,
              promptGroupId: promptGroupId.aiAssistant,
              provider: 'bedrock',
              model: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
              description: 'Default prompt for AI Assistant system prompt.',
              prompt: {
                default: 'Hello world this is a system prompt for bedrock claude-3-7-sonnet',
              },
            },
            references: [],
            managed: false,
            updated_at: '2025-01-22T19:11:48.806Z',
            updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            created_at: '2025-01-22T19:11:48.806Z',
            created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            version: 'Wzk4MCwxXQ==',
            coreMigrationVersion: '8.8.0',
            score: 0.13353139,
          },
          {
            type: 'security-ai-prompt',
            id: 'da530fad-87ce-49c3-a088-08073e5034d6',
            attributes: {
              promptId: promptDictionary.systemPrompt,
              promptGroupId: promptGroupId.aiAssistant,
              description: 'Default prompt for AI Assistant system prompt.',
              prompt: {
                default: 'Hello world this is a system prompt no model, no provider',
              },
            },
            references: [],
            managed: false,
            updated_at: '2025-01-22T19:12:12.911Z',
            updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            created_at: '2025-01-22T19:12:12.911Z',
            created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
            version: 'Wzk4MiwxXQ==',
            coreMigrationVersion: '8.8.0',
            score: 0.13353139,
          },
        ],
      }),
    } as unknown as jest.Mocked<SavedObjectsClientContract>;
  });

  describe('getPrompt', () => {
    it('returns the prompt matching provider and model (no connector lookup needed)', async () => {
      const getInferenceConnectorById = jest.fn();
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'openai',
        model: 'gpt-4o',
        getInferenceConnectorById,
        connectorId: 'connector-123',
      });
      expect(getInferenceConnectorById).not.toHaveBeenCalled();
      expect(result).toBe('Hello world this is a system prompt');
    });

    it('returns the prompt matching provider when model does not have a match', async () => {
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'openai',
        model: 'gpt-4o-mini',
      });
      expect(result).toBe('Hello world this is a system prompt no model');
    });

    it('calls getInferenceConnectorById when only provider is given', async () => {
      const getInferenceConnectorById = jest.fn().mockResolvedValue(openaiConnector);
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'openai',
        getInferenceConnectorById,
        connectorId: 'connector-123',
      });
      expect(getInferenceConnectorById).toHaveBeenCalledWith('connector-123');
      expect(result).toBe('Hello world this is a system prompt');
    });

    it('returns the default prompt when provider has no match', async () => {
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'badone',
      });
      expect(result).toBe('Hello world this is a system prompt no model, no provider');
    });

    it('resolves the real provider when provider is "inference" via getInferenceConnectorById', async () => {
      const getInferenceConnectorById = jest.fn().mockResolvedValue(inferenceBedrockConnector);
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'inference',
        model: 'gpt-4o',
        getInferenceConnectorById,
        connectorId: 'connector-123',
      });
      expect(getInferenceConnectorById).toHaveBeenCalledWith('connector-123');
      expect(result).toBe('Hello world this is a system prompt for bedrock claude-3-5-sonnet');
    });

    it('returns the expected prompt when provider is "elastic" and model matches in elasticModelDictionary', async () => {
      const getInferenceConnectorById = jest.fn().mockResolvedValue(inferenceElasticConnector);
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'inference',
        getInferenceConnectorById,
        connectorId: 'connector-123',
      });
      expect(result).toBe('Hello world this is a system prompt for bedrock claude-3-7-sonnet');
    });

    it('returns the bedrock prompt when provider is "elastic" but model does not match elasticModelDictionary', async () => {
      const getInferenceConnectorById = jest
        .fn()
        .mockResolvedValue(inferenceElasticUnknownConnector);
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'inference',
        getInferenceConnectorById,
        connectorId: 'connector-123',
      });
      expect(result).toBe('Hello world this is a system prompt no model, no provider');
    });

    it('returns the provider-specific prompt when connector has no model', async () => {
      const getInferenceConnectorById = jest
        .fn()
        .mockResolvedValue({ ...bedrockConnector, config: {} });
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'bedrock',
        getInferenceConnectorById,
        connectorId: 'connector-123',
      });
      expect(result).toBe('Hello world this is a system prompt for bedrock');
    });

    it('returns the default prompt when no prompts are found', async () => {
      savedObjectsClient.find.mockResolvedValue({
        page: 1,
        per_page: 20,
        total: 0,
        saved_objects: [],
      });
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        connectorId: 'connector-123',
      });
      expect(result).toBe('default system prompt');
    });

    it('throws an error when no prompts are found', async () => {
      savedObjectsClient.find.mockResolvedValue({
        page: 1,
        per_page: 20,
        total: 0,
        saved_objects: [],
      });
      await expect(
        getPrompt({
          savedObjectsClient,
          localPrompts,
          promptId: 'nonexistent-prompt',
          promptGroupId: 'nonexistent-group',
          connectorId: 'connector-123',
        })
      ).rejects.toThrow(
        'Prompt not found for promptId: nonexistent-prompt and promptGroupId: nonexistent-group'
      );
    });

    it('handles empty connector config gracefully when provider is "inference"', async () => {
      const getInferenceConnectorById = jest
        .fn()
        .mockResolvedValue({ ...inferenceBedrockConnector, config: {} });
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'inference',
        getInferenceConnectorById,
        connectorId: 'connector-123',
      });
      expect(result).toBe('Hello world this is a system prompt no model, no provider');
    });

    it('resolves provider and model from getInferenceConnectorById when none are provided', async () => {
      const getInferenceConnectorById = jest.fn().mockResolvedValue(bedrockConnector);
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        getInferenceConnectorById,
        connectorId: 'connector-123',
      });
      expect(getInferenceConnectorById).toHaveBeenCalled();
      expect(result).toBe('Hello world this is a system prompt for bedrock claude-3-5-sonnet');
    });

    it('finds the default prompt if no provider/model are indicated and no connector details are provided', async () => {
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
      });
      expect(result).toEqual('Hello world this is a system prompt no model, no provider');
    });

    it('uses getInferenceConnectorById for native ES inference endpoints', async () => {
      const getInferenceConnectorById = jest.fn().mockResolvedValue(inferenceEndpointAmazonBedrock);
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        getInferenceConnectorById,
        connectorId: 'my-bedrock-endpoint',
      });
      expect(getInferenceConnectorById).toHaveBeenCalledWith('my-bedrock-endpoint');
      expect(result).toBe('Hello world this is a system prompt for bedrock claude-3-5-sonnet');
    });

    it('falls back to default prompts when getInferenceConnectorById fails', async () => {
      const getInferenceConnectorById = jest.fn().mockRejectedValue(new Error('Not found'));
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        getInferenceConnectorById,
        connectorId: 'unknown-endpoint',
      });
      expect(result).toBe('Hello world this is a system prompt no model, no provider');
    });

    it('falls back to default prompts when no getInferenceConnectorById is provided', async () => {
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        connectorId: 'unknown-endpoint',
      });
      expect(result).toBe('Hello world this is a system prompt no model, no provider');
    });
  });

  describe('getPromptsByGroupId', () => {
    it('returns prompts matching the provided promptIds', async () => {
      const result = await getPromptsByGroupId({
        savedObjectsClient,
        localPrompts,
        promptIds: [promptDictionary.systemPrompt],
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'openai',
        model: 'gpt-4o',
        connectorId: 'connector-123',
      });
      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        type: 'security-ai-prompt',
        searchFields: ['promptGroupId'],
        search: promptGroupId.aiAssistant,
      });
      expect(result).toEqual([
        {
          promptId: promptDictionary.systemPrompt,
          prompt: 'Hello world this is a system prompt',
        },
      ]);
    });

    it('returns prompts matching the provided promptIds for gemini', async () => {
      const result = await getPromptsByGroupId({
        savedObjectsClient,
        localPrompts,
        promptIds: [promptDictionary.systemPrompt, promptDictionary.userPrompt],
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'gemini',
        connectorId: 'connector-123',
      });
      expect(result).toEqual([
        {
          promptId: promptDictionary.systemPrompt,
          prompt: 'Hello world this is a system prompt no model, no provider',
        },
        {
          promptId: promptDictionary.userPrompt,
          prompt: 'provider:gemini user prompt',
        },
      ]);
    });

    it('returns prompts using getInferenceConnectorById for gemini connector', async () => {
      const getInferenceConnectorById = jest.fn().mockResolvedValue(geminiConnector);
      const result = await getPromptsByGroupId({
        savedObjectsClient,
        localPrompts,
        promptIds: [promptDictionary.systemPrompt, promptDictionary.userPrompt],
        promptGroupId: promptGroupId.aiAssistant,
        getInferenceConnectorById,
        connectorId: 'connector-123',
      });
      expect(result).toEqual([
        {
          promptId: promptDictionary.systemPrompt,
          prompt: 'Hello world this is a system prompt no model, no provider',
        },
        {
          promptId: promptDictionary.userPrompt,
          prompt: 'provider:gemini user prompt',
        },
      ]);
    });

    it('returns prompts using getInferenceConnectorById for inference connector with elastic provider', async () => {
      const getInferenceConnectorById = jest
        .fn()
        .mockResolvedValue(inferenceElasticConnectorRainbow);
      const result = await getPromptsByGroupId({
        savedObjectsClient,
        localPrompts,
        promptIds: [promptDictionary.systemPrompt],
        promptGroupId: promptGroupId.aiAssistant,
        getInferenceConnectorById,
        connectorId: 'connector-123',
      });
      expect(result).toEqual([
        {
          promptId: promptDictionary.systemPrompt,
          prompt: 'Hello world this is a system prompt for bedrock claude-3-7-sonnet',
        },
      ]);
    });

    it('throws an error when a prompt is missing', async () => {
      savedObjectsClient.find.mockResolvedValue({
        page: 1,
        per_page: 20,
        total: 0,
        saved_objects: [],
      });
      await expect(
        getPromptsByGroupId({
          savedObjectsClient,
          localPrompts,
          promptIds: [promptDictionary.systemPrompt, 'fake-id'],
          promptGroupId: promptGroupId.aiAssistant,
          connectorId: 'connector-123',
        })
      ).rejects.toThrow('Prompt not found for promptId: fake-id and promptGroupId: aiAssistant');
    });

    it('finds the default prompt if no provider/model are indicated and no connector details are provided', async () => {
      const result = await getPromptsByGroupId({
        savedObjectsClient,
        localPrompts,
        promptIds: [promptDictionary.systemPrompt],
        promptGroupId: promptGroupId.aiAssistant,
      });
      expect(result).toEqual([
        {
          promptId: promptDictionary.systemPrompt,
          prompt: 'Hello world this is a system prompt no model, no provider',
        },
      ]);
    });
  });
});
