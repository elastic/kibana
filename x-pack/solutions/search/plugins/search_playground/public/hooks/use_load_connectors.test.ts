/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { useLoadConnectors } from './use_load_connectors';
import { useKibana } from './use_kibana';
import { waitFor, renderHook } from '@testing-library/react';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { isInferenceEndpointExists } from '@kbn/inference-endpoint-ui-common';

const mockedLoadConnectors = loadConnectors as jest.Mock;
const mockedUseKibana = useKibana as jest.Mock;
const mockedIsInferenceEndpointExists = isInferenceEndpointExists as jest.Mock;

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockImplementation(async (queryKey, fn, opts) => {
    try {
      const res = await fn();
      return Promise.resolve(res);
    } catch (e) {
      opts.onError(e);
    }
  }),
}));

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/constants', () => ({
  loadAllActions: jest.fn(),
}));

jest.mock('@kbn/inference-endpoint-ui-common', () => ({
  isInferenceEndpointExists: jest.fn(),
}));

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      http: {},
      notifications: {
        toasts: {
          addError: jest.fn(),
        },
      },
    },
  }),
}));

describe('useLoadConnectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully loads and transforms connectors', async () => {
    const connectors = [
      {
        id: '1',
        actionTypeId: '.gen-ai',
        isMissingSecrets: false,
        config: { apiProvider: OpenAiProviderType.OpenAi },
      },
      {
        id: '2',
        actionTypeId: 'slack',
        isMissingSecrets: false,
      },
      {
        id: '3',
        actionTypeId: '.gen-ai',
        isMissingSecrets: false,
        config: { apiProvider: OpenAiProviderType.AzureAi },
      },
      {
        id: '4',
        actionTypeId: '.bedrock',
        isMissingSecrets: false,
      },
      {
        id: '5',
        actionTypeId: '.gen-ai',
        isMissingSecrets: false,
        config: { apiProvider: OpenAiProviderType.Other },
      },
      {
        id: '6',
        actionTypeId: '.inference',
        isMissingSecrets: false,
        config: { provider: 'openai', taskType: 'chat_completion' },
      },
    ];
    mockedLoadConnectors.mockResolvedValue(connectors);
    mockedIsInferenceEndpointExists.mockResolvedValue(true);

    const { result } = renderHook(() => useLoadConnectors());
    await waitFor(() =>
      expect(result.current).resolves.toStrictEqual([
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
        {
          actionTypeId: '.bedrock',
          id: '4',
          isMissingSecrets: false,
          title: 'Bedrock',
          type: 'bedrock',
        },
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
        {
          actionTypeId: '.inference',
          config: {
            provider: 'openai',
            taskType: 'chat_completion',
          },
          id: '6',
          isMissingSecrets: false,
          title: 'AI Connector',
          type: 'inference',
        },
      ])
    );
  });

  it('handles pre-configured connectors', async () => {
    const connectors = [
      {
        id: '1',
        actionTypeId: '.gen-ai',
        isMissingSecrets: false,
        isPreconfigured: true,
        name: 'OpenAI',
      },
      {
        id: '2',
        actionTypeId: 'slack',
        isMissingSecrets: false,
      },
      {
        id: '3',
        actionTypeId: '.gen-ai',
        isMissingSecrets: false,
        config: { apiProvider: OpenAiProviderType.AzureAi },
      },
    ];
    mockedLoadConnectors.mockResolvedValue(connectors);

    const { result } = renderHook(() => useLoadConnectors());
    await waitFor(() =>
      expect(result.current).resolves.toStrictEqual([
        {
          actionTypeId: '.gen-ai',
          id: '1',
          isMissingSecrets: false,
          isPreconfigured: true,
          name: 'OpenAI',
          title: 'OpenAI',
          type: 'openai',
        },
        {
          actionTypeId: '.gen-ai',
          config: { apiProvider: 'Azure OpenAI' },
          id: '3',
          isMissingSecrets: false,
          title: 'OpenAI Azure',
          type: 'openai_azure',
        },
      ])
    );
  });

  it('handles errors correctly', async () => {
    const error = new Error('Test Error');
    mockedLoadConnectors.mockRejectedValue(error);

    renderHook(() => useLoadConnectors());
    await waitFor(() =>
      expect(mockedUseKibana().services.notifications.toasts.addError).toHaveBeenCalledWith(
        error,
        expect.any(Object)
      )
    );
  });
});
