/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrompt, getPromptsByGroupId } from './get_prompt';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { localPrompts, promptDictionary, promptGroupId } from './mock_prompts';

jest.mock('@kbn/core-saved-objects-api-server');
jest.mock('@kbn/actions-plugin/server');
const defaultConnector = {
  id: 'mock',
  name: 'Mock',
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  actionTypeId: '.inference',
};
describe('get_prompt', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let actionsClient: jest.Mocked<ActionsClient>;

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

    actionsClient = {
      get: jest.fn().mockResolvedValue({
        config: {
          provider: 'openai',
          providerConfig: { model_id: 'gpt-4o' },
        },
      }),
    } as unknown as jest.Mocked<ActionsClient>;
  });
  describe('getPrompt', () => {
    it('returns the prompt matching provider and model', async () => {
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'openai',
        model: 'gpt-4o',
        actionsClient,
        connectorId: 'connector-123',
      });
      expect(actionsClient.get).not.toHaveBeenCalled();

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
        actionsClient,
        connectorId: 'connector-123',
      });
      expect(actionsClient.get).not.toHaveBeenCalled();

      expect(result).toBe('Hello world this is a system prompt no model');
    });

    it('returns the prompt matching provider when model is not provided', async () => {
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'openai',
        actionsClient,
        connectorId: 'connector-123',
      });
      expect(actionsClient.get).toHaveBeenCalled();

      expect(result).toBe('Hello world this is a system prompt no model');
    });

    it('returns the default prompt when there is no match on provider', async () => {
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'badone',
        actionsClient,
        connectorId: 'connector-123',
      });

      expect(result).toBe('Hello world this is a system prompt no model, no provider');
    });

    it('defaults provider to bedrock if provider is "inference"', async () => {
      actionsClient.get.mockResolvedValue(defaultConnector);

      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'inference',
        model: 'gpt-4o',
        actionsClient,
        connectorId: 'connector-123',
      });

      expect(result).toBe('Hello world this is a system prompt for bedrock');
    });

    it('returns the expected prompt from when provider is "elastic" and model matches in elasticModelDictionary', async () => {
      actionsClient.get.mockResolvedValue({
        ...defaultConnector,
        config: {
          provider: 'elastic',
          providerConfig: { model_id: 'rainbow-sprinkles' },
        },
      });

      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'inference',
        actionsClient,
        connectorId: 'connector-123',
      });

      expect(result).toBe('Hello world this is a system prompt for bedrock claude-3-5-sonnet');
    });

    it('returns the bedrock prompt when provider is "elastic" but model does not match elasticModelDictionary', async () => {
      actionsClient.get.mockResolvedValue({
        ...defaultConnector,
        config: {
          provider: 'elastic',
          providerConfig: { model_id: 'unknown-model' },
        },
      });

      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'inference',
        actionsClient,
        connectorId: 'connector-123',
      });

      expect(result).toBe('Hello world this is a system prompt for bedrock');
    });

    it('returns the model prompt when no prompts are found and model is provided', async () => {
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
        actionsClient,
        provider: 'bedrock',
        connectorId: 'connector-123',
      });

      expect(result).toBe('provider:bedrock default system prompt');
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
        actionsClient,
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
          actionsClient,
          connectorId: 'connector-123',
        })
      ).rejects.toThrow(
        'Prompt not found for promptId: nonexistent-prompt and promptGroupId: nonexistent-group'
      );
    });

    it('handles invalid connector configuration gracefully when provider is "inference"', async () => {
      actionsClient.get.mockResolvedValue({
        ...defaultConnector,
        config: {},
      });
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'inference',
        actionsClient,
        connectorId: 'connector-123',
      });

      expect(result).toBe('Hello world this is a system prompt for bedrock');
    });

    it('retrieves the connector when no model or provider is provided', async () => {
      actionsClient.get.mockResolvedValue({
        ...defaultConnector,
        actionTypeId: '.bedrock',
        config: {
          defaultModel: 'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
        },
      });
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        actionsClient,
        connectorId: 'connector-123',
      });
      expect(actionsClient.get).toHaveBeenCalled();

      expect(result).toBe('Hello world this is a system prompt for bedrock claude-3-5-sonnet');
    });

    it('retrieves the connector when no model is provided', async () => {
      actionsClient.get.mockResolvedValue({
        ...defaultConnector,
        actionTypeId: '.bedrock',
        config: {
          defaultModel: 'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
        },
      });
      const result = await getPrompt({
        savedObjectsClient,
        localPrompts,
        promptId: promptDictionary.systemPrompt,
        promptGroupId: promptGroupId.aiAssistant,
        provider: 'bedrock',
        actionsClient,
        connectorId: 'connector-123',
      });
      expect(actionsClient.get).toHaveBeenCalled();

      expect(result).toBe('Hello world this is a system prompt for bedrock claude-3-5-sonnet');
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
        actionsClient,
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
        actionsClient,
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

    it('returns prompts matching the provided promptIds when connector is given', async () => {
      const result = await getPromptsByGroupId({
        savedObjectsClient,
        localPrompts,
        promptIds: [promptDictionary.systemPrompt, promptDictionary.userPrompt],
        promptGroupId: promptGroupId.aiAssistant,
        connector: {
          actionTypeId: '.gemini',
          config: {
            defaultModel: 'gemini-1.5-pro-002',
          },
          id: 'connector-123',
          name: 'Gemini',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
        },
        actionsClient,
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
    it('returns prompts matching the provided promptIds when inference connector is given', async () => {
      const result = await getPromptsByGroupId({
        savedObjectsClient,
        localPrompts,
        promptIds: [promptDictionary.systemPrompt],
        promptGroupId: promptGroupId.aiAssistant,
        connector: {
          actionTypeId: '.inference',
          config: {
            provider: 'elastic',
            providerConfig: { model_id: 'rainbow-sprinkles' },
          },
          id: 'connector-123',
          name: 'Inference',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
        },
        actionsClient,
        connectorId: 'connector-123',
      });

      expect(result).toEqual([
        {
          promptId: promptDictionary.systemPrompt,
          prompt: 'Hello world this is a system prompt for bedrock',
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
          actionsClient,
          connectorId: 'connector-123',
        })
      ).rejects.toThrow('Prompt not found for promptId: fake-id and promptGroupId: aiAssistant');
    });
  });
});
