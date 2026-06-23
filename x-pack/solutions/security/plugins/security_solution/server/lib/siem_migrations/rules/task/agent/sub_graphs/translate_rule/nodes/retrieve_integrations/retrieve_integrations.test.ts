/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationIntegration } from '../../../../../../types';
import type { RuleMigrationsRetriever } from '../../../../../retrievers';
import type { RuleMigrationTelemetryClient } from '../../../../../rule_migrations_telemetry_client';
import type { TranslateRuleState } from '../../types';
import { getRetrieveIntegrationsNode } from './retrieve_integrations';

jest.mock('./prompts', () => {
  const invoke = jest.fn();

  return {
    MATCH_INTEGRATION_PROMPT: {
      pipe: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          invoke,
        }),
      }),
    },
    __mockInvoke: invoke,
  };
});

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

const baseState = (overrides: Partial<TranslateRuleState> = {}): TranslateRuleState =>
  ({
    original_rule: {
      title: 'Office Document Executing Macro Code',
      description: 'Macro execution behavior',
      vendor: 'splunk',
      language: 'kuery',
    },
    semantic_query: 'office macro behavior',
    nl_query: 'Detect office macro execution',
    ...overrides,
  } as unknown as TranslateRuleState);

describe('getRetrieveIntegrationsNode', () => {
  const mockIntegrationsSearch = jest.fn();
  const mockPromptInvoke = (jest.requireMock('./prompts') as { __mockInvoke: jest.Mock })
    .__mockInvoke;
  const mockTelemetryClient = {
    reportIntegrationsMatch: jest.fn(),
  } as unknown as jest.Mocked<RuleMigrationTelemetryClient>;
  const mockRuleMigrationsRetriever = {
    integrations: {
      search: mockIntegrationsSearch,
    },
  } as unknown as RuleMigrationsRetriever;

  const node = getRetrieveIntegrationsNode({
    model: {} as never,
    telemetryClient: mockTelemetryClient,
    ruleMigrationsRetriever: mockRuleMigrationsRetriever,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPromptInvoke.mockReset();
  });

  it('returns no-match comment and telemetry when semantic query yields no integrations', async () => {
    mockIntegrationsSearch.mockResolvedValue([]);

    const result = await node(baseState(), {});

    expect(result.integration).toBeUndefined();
    expect(result.comments).toHaveLength(1);
    expect(mockIntegrationsSearch).toHaveBeenCalledWith('office macro behavior');
    expect(mockTelemetryClient.reportIntegrationsMatch).toHaveBeenCalledWith({
      preFilterIntegrations: [],
    });
    expect(mockPromptInvoke).not.toHaveBeenCalled();
  });

  it('returns integration and telemetry when llm selects a valid integration id', async () => {
    mockIntegrationsSearch.mockResolvedValue([mockIntegration]);
    mockPromptInvoke.mockResolvedValue({
      id: mockIntegration.id,
      summary: '## Integration Matching Summary\nMatched integration.',
    });

    const result = await node(baseState(), {});

    expect(result.integration).toEqual(mockIntegration);
    expect(result.comments).toHaveLength(1);
    expect(mockTelemetryClient.reportIntegrationsMatch).toHaveBeenCalledWith({
      preFilterIntegrations: [mockIntegration],
      postFilterIntegration: mockIntegration,
    });
  });

  it('returns comment only when llm id does not match any integration', async () => {
    mockIntegrationsSearch.mockResolvedValue([mockIntegration]);
    mockPromptInvoke.mockResolvedValue({
      id: 'missing-id',
      summary: '## Integration Matching Summary\nNo exact integration match.',
    });

    const result = await node(baseState(), {});

    expect(result.integration).toBeUndefined();
    expect(result.comments).toHaveLength(1);
    expect(mockTelemetryClient.reportIntegrationsMatch).toHaveBeenCalledWith({
      preFilterIntegrations: [mockIntegration],
      postFilterIntegration: undefined,
    });
  });
});
