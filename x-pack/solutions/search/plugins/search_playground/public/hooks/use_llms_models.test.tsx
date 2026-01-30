/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { LoadConnectorsQuery } from './use_load_connectors';
import { useLLMsModels } from './use_llms_models';
import { LLMs } from '../types';
import { elasticModelIds } from '@kbn/inference-common';

jest.mock('./use_load_connectors', () => ({
  useLoadConnectors: jest.fn(),
  LOAD_CONNECTORS_QUERY_KEY: jest.requireActual('./use_load_connectors').LOAD_CONNECTORS_QUERY_KEY,
  LoadConnectorsQuery: jest.fn(),
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

const mockedLoadConnectorsQuery = jest.fn();

const mockConnectors = [
  {
    id: 'connectorId0',
    name: 'Elastic Managed LLM',
    actionTypeId: '.inference',
    type: LLMs.inference,
    isPreconfigured: true,
    config: {
      taskType: 'chat_completion',
      provider: 'elastic',
      providerConfig: { model_id: elasticModelIds.RainbowSprinkles },
    },
  },
  { id: 'connectorId1', name: 'OpenAI Connector', type: LLMs.openai },
  { id: 'connectorId2', name: 'OpenAI Azure Connector', type: LLMs.openai_azure },
  { id: 'connectorId2', name: 'Bedrock Connector', type: LLMs.bedrock },
  { id: 'connectorId3', name: 'OpenAI OSS Model Connector', type: LLMs.openai_other },
  {
    id: 'connectorId4',
    name: 'EIS Connector',
    type: LLMs.inference,
    config: { provider: 'openai' },
  },
];
const mockLoadConnectorsQuery = (data: any) => {
  (LoadConnectorsQuery as jest.Mock).mockReturnValue(mockedLoadConnectorsQuery);
  mockedLoadConnectorsQuery.mockResolvedValue(data);
};

describe('useLLMsModels Query Hook', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: React.PropsWithChildren<{}>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('returns LLMModels with connectors available', async () => {
    mockLoadConnectorsQuery(mockConnectors);

    const { result } = renderHook(() => useLLMsModels(), { wrapper });
    await waitFor(() => expect(mockedLoadConnectorsQuery).toHaveBeenCalledTimes(1));

    await waitFor(() =>
      expect(result.current).toStrictEqual([
        {
          connectorId: 'connectorId0',
          connectorName: 'Elastic Managed LLM',
          connectorType: LLMs.inference,
          disabled: false,
          icon: expect.any(String),
          id: 'connectorId0Elastic Managed LLM',
          isElasticConnector: true,
          name: 'Elastic Managed LLM',
          showConnectorName: true,
          value: 'rainbow-sprinkles',
          promptTokenLimit: 200000,
        },
        {
          connectorId: 'connectorId1',
          connectorName: 'OpenAI Connector',
          connectorType: LLMs.openai,
          disabled: false,
          icon: expect.any(String),
          id: 'connectorId1OpenAI GPT-4o ',
          isElasticConnector: false,
          name: 'OpenAI GPT-4o ',
          showConnectorName: false,
          value: 'gpt-4o',
          promptTokenLimit: 128000,
        },
        {
          connectorId: 'connectorId1',
          connectorName: 'OpenAI Connector',
          connectorType: LLMs.openai,
          disabled: false,
          icon: expect.any(String),
          id: 'connectorId1OpenAI GPT-4 Turbo ',
          isElasticConnector: false,
          name: 'OpenAI GPT-4 Turbo ',
          showConnectorName: false,
          value: 'gpt-4-turbo',
          promptTokenLimit: 128000,
        },
        {
          connectorId: 'connectorId1',
          connectorName: 'OpenAI Connector',
          connectorType: LLMs.openai,
          disabled: false,
          icon: expect.any(String),
          id: 'connectorId1OpenAI GPT-3.5 Turbo ',
          isElasticConnector: false,
          name: 'OpenAI GPT-3.5 Turbo ',
          showConnectorName: false,
          value: 'gpt-3.5-turbo',
          promptTokenLimit: 16385,
        },
        {
          connectorId: 'connectorId2',
          connectorName: 'OpenAI Azure Connector',
          connectorType: LLMs.openai_azure,
          disabled: false,
          icon: expect.any(String),
          id: 'connectorId2OpenAI Azure Connector (Azure OpenAI)',
          isElasticConnector: false,
          name: 'OpenAI Azure Connector (Azure OpenAI)',
          showConnectorName: false,
          value: undefined,
          promptTokenLimit: undefined,
        },
        {
          connectorId: 'connectorId2',
          connectorName: 'Bedrock Connector',
          connectorType: LLMs.bedrock,
          disabled: false,
          icon: expect.any(String),
          id: 'connectorId2Anthropic Claude 3 Haiku',
          isElasticConnector: false,
          name: 'Anthropic Claude 3 Haiku',
          showConnectorName: false,
          value: 'anthropic.claude-3-haiku-20240307-v1:0',
          promptTokenLimit: 200000,
        },
        {
          connectorId: 'connectorId2',
          connectorName: 'Bedrock Connector',
          connectorType: LLMs.bedrock,
          disabled: false,
          icon: expect.any(String),
          id: 'connectorId2Anthropic Claude 3.5 Sonnet',
          isElasticConnector: false,
          name: 'Anthropic Claude 3.5 Sonnet',
          showConnectorName: false,
          value: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
          promptTokenLimit: 200000,
        },
        {
          connectorId: 'connectorId2',
          connectorName: 'Bedrock Connector',
          connectorType: LLMs.bedrock,
          disabled: false,
          icon: expect.any(String),
          id: 'connectorId2Anthropic Claude 3.7 Sonnet',
          isElasticConnector: false,
          name: 'Anthropic Claude 3.7 Sonnet',
          showConnectorName: false,
          value: 'anthropic.claude-3-7-sonnet-20250219-v1:0',
          promptTokenLimit: 200000,
        },
        {
          connectorId: 'connectorId3',
          connectorName: 'OpenAI OSS Model Connector',
          connectorType: LLMs.openai_other,
          disabled: false,
          icon: expect.any(String),
          id: 'connectorId3OpenAI OSS Model Connector (OpenAI Compatible Service)',
          isElasticConnector: false,
          name: 'OpenAI OSS Model Connector (OpenAI Compatible Service)',
          showConnectorName: false,
          value: undefined,
          promptTokenLimit: undefined,
        },
        {
          connectorId: 'connectorId4',
          connectorName: 'EIS Connector',
          connectorType: LLMs.inference,
          disabled: false,
          icon: expect.any(String),
          id: 'connectorId4EIS Connector',
          isElasticConnector: false,
          name: 'EIS Connector',
          showConnectorName: true,
          value: undefined,
          promptTokenLimit: undefined,
        },
      ])
    );
  });

  it('returns emptyd when connectors not available', async () => {
    mockLoadConnectorsQuery([]);

    const { result } = renderHook(() => useLLMsModels(), { wrapper });

    await waitFor(() => expect(mockedLoadConnectorsQuery).toHaveBeenCalledTimes(1));

    expect(result.current).toEqual([]);
  });
});
