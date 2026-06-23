/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { RuleMigrationIntegration } from '../../../../../../types';
import type { ModelWithTools } from '../../../../types';
import type { RuleMigrationsRetriever } from '../../../../../retrievers';
import type { RuleMigrationTelemetryClient } from '../../../../../rule_migrations_telemetry_client';
import { getRetrieveIntegrationsNode } from './retrieve_integrations';
import type { RetrieveIntegrationsState } from './state';

jest.mock('./prompts', () => ({
  RETRIEVE_INTEGRATION_PROMPT: {
    formatMessages: jest.fn().mockResolvedValue([{ role: 'system', content: 'prompt' }]),
  },
}));

const mockIntegration: RuleMigrationIntegration = {
  id: 'testintegration',
  title: 'testintegration',
  description: 'testintegration',
  data_streams: [
    {
      dataset: 'teststream',
      title: 'teststream',
      index_pattern: 'logs-testintegration-teststream-default',
    },
  ],
  elser_embedding: 'testintegration embedding',
  fields_metadata: undefined,
};

const baseState = (overrides: Partial<RetrieveIntegrationsState> = {}): RetrieveIntegrationsState =>
  ({
    title: 'Office Document Executing Macro Code',
    description: 'Macro execution behavior',
    inline_query: 'FROM logs-*',
    nl_query: 'Detect office macro execution',
    semantic_query: '',
    messages: [],
    ...overrides,
  } as unknown as RetrieveIntegrationsState);

describe('getRetrieveIntegrationsNode', () => {
  const mockInvoke = jest.fn();
  const mockIntegrationsSearch = jest.fn();
  const mockTelemetryClient = {
    reportIntegrationsMatch: jest.fn(),
  } as unknown as jest.Mocked<RuleMigrationTelemetryClient>;
  const mockRuleMigrationsRetriever = {
    integrations: {
      search: mockIntegrationsSearch,
    },
  } as unknown as RuleMigrationsRetriever;

  const node = getRetrieveIntegrationsNode({
    model: {
      invoke: mockInvoke,
    } as unknown as ModelWithTools,
    telemetryClient: mockTelemetryClient,
    ruleMigrationsRetriever: mockRuleMigrationsRetriever,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the AI tool-calling response to continue the tool loop', async () => {
    const toolCallingResponse = new AIMessage({
      content: '',
      tool_calls: [
        {
          id: 'tool-call-1',
          name: 'searchIntegrations',
          args: {
            query: 'office macro behavior',
          },
        },
      ],
    });

    mockInvoke.mockResolvedValue(toolCallingResponse);

    const result = await node(baseState());

    expect(result.messages).toEqual([toolCallingResponse]);
    expect(mockTelemetryClient.reportIntegrationsMatch).not.toHaveBeenCalled();
    expect(mockIntegrationsSearch).not.toHaveBeenCalled();
  });

  it('matches integrations by hydrating from retriever with semantic query', async () => {
    const toolResult = new ToolMessage({
      tool_call_id: 'tool-call-1',
      content: JSON.stringify({
        source: 'integrationSearch',
        query: 'office macro behavior',
        count: 1,
        hasUsefulResults: true,
        results: [mockIntegration],
      }),
    });

    const llmFinalResponse = new AIMessage({
      content: JSON.stringify({
        semantic_query: 'office macro behavior',
        id: mockIntegration.id,
        summary: '## Integration Matching Summary\nMatched based on integration tool output.',
      }),
    });

    mockInvoke.mockResolvedValue(llmFinalResponse);
    mockIntegrationsSearch.mockResolvedValue([mockIntegration]);

    const result = await node(
      baseState({
        messages: [toolResult],
      })
    );

    expect(result.integration).toEqual(mockIntegration);
    expect(result.semantic_query).toBe('office macro behavior');
    expect(result.comments).toHaveLength(1);
    expect(mockIntegrationsSearch).toHaveBeenCalledWith('office macro behavior');
    expect(mockTelemetryClient.reportIntegrationsMatch).toHaveBeenCalledWith({
      preFilterIntegrations: [mockIntegration],
      postFilterIntegration: mockIntegration,
    });
  });

  it('hydrates integration candidates when tool payload omits ids', async () => {
    const toolResult = new ToolMessage({
      tool_call_id: 'tool-call-2',
      content: JSON.stringify({
        source: 'integrationSearch',
        query: 'office macro behavior',
        count: 1,
        hasUsefulResults: true,
        results: [
          {
            title: mockIntegration.title,
            description: mockIntegration.description,
          },
        ],
      }),
    });
    const llmFinalResponse = new AIMessage({
      content: JSON.stringify({
        semantic_query: 'office macro behavior',
        id: mockIntegration.id,
        summary: '## Integration Matching Summary\nMatched after hydration.',
      }),
    });

    mockInvoke.mockResolvedValue(llmFinalResponse);
    mockIntegrationsSearch.mockResolvedValue([mockIntegration]);

    const result = await node(
      baseState({
        messages: [toolResult],
      })
    );

    expect(mockIntegrationsSearch).toHaveBeenCalledWith('office macro behavior');
    expect(result.integration).toEqual(mockIntegration);
    expect(mockTelemetryClient.reportIntegrationsMatch).toHaveBeenCalledWith({
      preFilterIntegrations: [mockIntegration],
      postFilterIntegration: mockIntegration,
    });
  });

  it('does not match integration when no integration tool payload exists', async () => {
    mockInvoke.mockResolvedValue(
      JSON.stringify({
        semantic_query: 'tool-only integration semantic query',
        id: mockIntegration.id,
        summary: '## Integration Matching Summary\nNo integration tool results were found.',
      })
    );
    mockIntegrationsSearch.mockResolvedValue([]);

    const result = await node(baseState());

    expect(result.integration).toBeUndefined();
    expect(result.semantic_query).toBe('tool-only integration semantic query');
    expect(mockIntegrationsSearch).toHaveBeenCalledWith('tool-only integration semantic query');
    expect(mockTelemetryClient.reportIntegrationsMatch).toHaveBeenCalledWith({
      preFilterIntegrations: [],
    });
  });

  it('keeps integration empty and reports no-match telemetry when id is missing', async () => {
    mockInvoke.mockResolvedValue(
      JSON.stringify({
        semantic_query: 'no match semantic query',
        id: '',
        summary: '## Integration Matching Summary\nNo related integration found.',
      })
    );
    mockIntegrationsSearch.mockResolvedValue([]);

    const result = await node(baseState());

    expect(result.integration).toBeUndefined();
    expect(result.semantic_query).toBe('no match semantic query');
    expect(result.comments).toHaveLength(1);
    expect(mockIntegrationsSearch).toHaveBeenCalledWith('no match semantic query');
    expect(mockTelemetryClient.reportIntegrationsMatch).toHaveBeenCalledWith({
      preFilterIntegrations: [],
    });
  });
});
