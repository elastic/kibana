/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const mockIsInferenceEndpointExists = jest.fn();
jest.mock('@kbn/inference-endpoint-ui-common', () => ({
  isInferenceEndpointExists: (http: HttpSetup, inferenceId: string) =>
    mockIsInferenceEndpointExists(http, inferenceId),
}));

import {
  OPENAI_CONNECTOR_ID,
  OpenAiProviderType,
  BEDROCK_CONNECTOR_ID,
  GEMINI_CONNECTOR_ID,
  INFERENCE_CONNECTOR_ID,
} from '@kbn/stack-connectors-plugin/public/common';
import { type ActionConnector } from '../types';

import { parsePlaygroundConnectors } from './playground_connectors';
import { HttpSetup } from '@kbn/core/public';

describe('PlaygroundConnector utilities', () => {
  const mockHttp = {} as unknown as HttpSetup;
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsInferenceEndpointExists.mockResolvedValue(true);
  });
  describe('parsePlaygroundConnectors', () => {
    it('should parse open ai connectors', async () => {
      const connectors: ActionConnector[] = [
        {
          id: '1',
          actionTypeId: OPENAI_CONNECTOR_ID,
          isMissingSecrets: false,
          config: { apiProvider: OpenAiProviderType.OpenAi },
        } as unknown as ActionConnector,
      ];

      expect(parsePlaygroundConnectors(connectors, mockHttp)).resolves.toStrictEqual([
        {
          actionTypeId: '.gen-ai',
          config: {
            apiProvider: 'OpenAI',
          },
          id: '1',
          isMissingSecrets: false,
          title: 'OpenAI',
          type: 'openai',
        },
      ]);
    });
    it('should parse preconfigured open ai connectors', async () => {
      const connectors: ActionConnector[] = [
        {
          id: '1',
          actionTypeId: OPENAI_CONNECTOR_ID,
          isMissingSecrets: false,
          isPreconfigured: true,
          name: 'OpenAI',
        } as unknown as ActionConnector,
      ];

      expect(parsePlaygroundConnectors(connectors, mockHttp)).resolves.toStrictEqual([
        {
          actionTypeId: '.gen-ai',
          id: '1',
          isMissingSecrets: false,
          isPreconfigured: true,
          name: 'OpenAI',
          title: 'OpenAI',
          type: 'openai',
        },
      ]);
    });
    it('should parse azure open ai connectors', async () => {
      const connectors: ActionConnector[] = [
        {
          id: '3',
          actionTypeId: OPENAI_CONNECTOR_ID,
          isMissingSecrets: false,
          config: { apiProvider: OpenAiProviderType.AzureAi },
        } as unknown as ActionConnector,
      ];

      expect(parsePlaygroundConnectors(connectors, mockHttp)).resolves.toStrictEqual([
        {
          actionTypeId: '.gen-ai',
          config: {
            apiProvider: 'Azure OpenAI',
          },
          id: '3',
          isMissingSecrets: false,
          title: 'OpenAI Azure',
          type: 'openai_azure',
        },
      ]);
    });
    it('should parse other open ai connectors', async () => {
      const connectors: ActionConnector[] = [
        {
          id: '5',
          actionTypeId: OPENAI_CONNECTOR_ID,
          isMissingSecrets: false,
          config: { apiProvider: OpenAiProviderType.Other },
        } as unknown as ActionConnector,
      ];

      expect(parsePlaygroundConnectors(connectors, mockHttp)).resolves.toStrictEqual([
        {
          actionTypeId: '.gen-ai',
          config: {
            apiProvider: 'Other',
          },
          id: '5',
          isMissingSecrets: false,
          title: 'OpenAI Other',
          type: 'openai_other',
        },
      ]);
    });
    it('should parse bedrock connectors', async () => {
      const connectors: ActionConnector[] = [
        {
          id: '4',
          actionTypeId: BEDROCK_CONNECTOR_ID,
          isMissingSecrets: false,
        } as unknown as ActionConnector,
      ];

      expect(parsePlaygroundConnectors(connectors, mockHttp)).resolves.toStrictEqual([
        {
          actionTypeId: '.bedrock',
          id: '4',
          isMissingSecrets: false,
          title: 'Bedrock',
          type: 'bedrock',
        },
      ]);
    });
    it('should parse gemini connectors', async () => {
      const connectors: ActionConnector[] = [
        {
          id: '7',
          actionTypeId: GEMINI_CONNECTOR_ID,
          isMissingSecrets: false,
        } as unknown as ActionConnector,
      ];

      expect(parsePlaygroundConnectors(connectors, mockHttp)).resolves.toStrictEqual([
        {
          actionTypeId: '.gemini',
          id: '7',
          isMissingSecrets: false,
          title: 'Gemini',
          type: 'gemini',
        },
      ]);
    });
    it('should parse inference api connectors', async () => {
      const connectors: ActionConnector[] = [
        {
          id: '6',
          actionTypeId: INFERENCE_CONNECTOR_ID,
          isMissingSecrets: false,
          config: { inferenceId: 'unit-test', provider: 'openai', taskType: 'chat_completion' },
        } as unknown as ActionConnector,
      ];

      expect(parsePlaygroundConnectors(connectors, mockHttp)).resolves.toStrictEqual([
        {
          actionTypeId: '.inference',
          config: {
            inferenceId: 'unit-test',
            provider: 'openai',
            taskType: 'chat_completion',
          },
          id: '6',
          isMissingSecrets: false,
          title: 'AI Connector',
          type: 'inference',
        },
      ]);
    });
    it('should not include inference api connectors with out endpoints', async () => {
      mockIsInferenceEndpointExists.mockResolvedValue(false);
      const connectors: ActionConnector[] = [
        {
          id: '6',
          actionTypeId: INFERENCE_CONNECTOR_ID,
          isMissingSecrets: false,
          config: { inferenceId: 'unit-test', provider: 'openai', taskType: 'chat_completion' },
        } as unknown as ActionConnector,
      ];

      expect(parsePlaygroundConnectors(connectors, mockHttp)).resolves.toStrictEqual([]);
    });
    it('should not include connectors with missing secrets', async () => {
      const connectors: ActionConnector[] = [
        {
          id: '3',
          actionTypeId: OPENAI_CONNECTOR_ID,
          isMissingSecrets: true,
          config: { apiProvider: OpenAiProviderType.AzureAi },
        } as unknown as ActionConnector,
      ];

      expect(parsePlaygroundConnectors(connectors, mockHttp)).resolves.toStrictEqual([]);
    });
    it('should not include connectors with out a transform defined', async () => {
      const connectors: ActionConnector[] = [
        {
          id: '2',
          actionTypeId: 'slack',
          isMissingSecrets: false,
        } as unknown as ActionConnector,
      ];

      expect(parsePlaygroundConnectors(connectors, mockHttp)).resolves.toStrictEqual([]);
    });
  });
});
