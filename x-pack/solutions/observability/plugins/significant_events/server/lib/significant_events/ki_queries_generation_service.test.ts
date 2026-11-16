/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { EbtTelemetryClient } from '../telemetry/ebt';
import {
  generateKIQueries,
  type GenerateKIQueriesDependencies,
} from './ki_queries_generation_service';
import {
  executeKIQueryGenerationAgent,
  KIQueryGenerationAgentError,
} from './identify_ki_queries_via_agent';

jest.mock('./identify_ki_queries_via_agent', () => ({
  ...jest.requireActual('./identify_ki_queries_via_agent'),
  executeKIQueryGenerationAgent: jest.fn(),
}));

const executeKIQueryGenerationAgentMock = executeKIQueryGenerationAgent as jest.MockedFunction<
  typeof executeKIQueryGenerationAgent
>;

const source = {
  id: 'source-1',
  slug: 'checkout',
  title: 'Checkout',
  view_name: '$.nightshift.sources.default.checkout',
} as NightshiftSource;

const makeDeps = (
  overrides: Partial<GenerateKIQueriesDependencies> = {}
): GenerateKIQueriesDependencies => ({
  kiClient: {
    getSourceToQueryLinksMap: jest.fn().mockResolvedValue({
      'source-1': [
        {
          query: {
            id: 'query-1',
            title: 'Error rate',
            type: 'stats',
            severity_score: 65,
            description: 'Tracks error rate',
            esql: {
              query:
                'FROM $.nightshift.sources.default.checkout | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)',
            },
          },
        },
      ],
    }),
  } as unknown as GenerateKIQueriesDependencies['kiClient'],
  agentBuilder: {} as AgentBuilderPluginStart,
  resolveModel: jest.fn(async (connectorId?: string) => connectorId ?? 'default-connector'),
  request: {} as GenerateKIQueriesDependencies['request'],
  logger: loggerMock.create(),
  signal: new AbortController().signal,
  telemetry: {
    trackSignificantEventsQueriesGenerated: jest.fn(),
  } as unknown as EbtTelemetryClient,
  ...overrides,
});

describe('generateKIQueries', () => {
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = loggerMock.create();
    executeKIQueryGenerationAgentMock.mockReset();
    executeKIQueryGenerationAgentMock.mockResolvedValue({
      queries: [
        {
          type: 'match',
          title: 'Detects failures',
          description: 'A query',
          esql: { query: 'FROM logs | WHERE message == "fail"' },
          evidence: ['evidence'],
          features: [],
          severity_score: 70,
        },
      ],
      tokensUsed: { prompt: 10, completion: 20, total: 30, cached: 0 },
    });
  });

  it('returns generated queries and reports telemetry', async () => {
    const telemetry = {
      trackSignificantEventsQueriesGenerated: jest.fn(),
    } as unknown as EbtTelemetryClient;

    const result = await generateKIQueries(
      {
        source,
        connectorId: 'test-connector',
        runId: 'run-1',
        workflowExecutionId: 'run-1',
        parentWorkflowExecutionId: 'onboarding-run-1',
        maxExistingQueriesForContext: 10,
      },
      makeDeps({ telemetry, logger })
    );

    expect(result).toEqual({
      queries: [
        {
          type: 'match',
          title: 'Detects failures',
          description: 'A query',
          esql: { query: 'FROM logs | WHERE message == "fail"' },
          evidence: ['evidence'],
          features: [],
          severity_score: 70,
        },
      ],
      tokensUsed: { prompt: 10, completion: 20, total: 30, cached: 0 },
      connectorId: 'test-connector',
    });
    expect(executeKIQueryGenerationAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        interactionId: 'run-1',
        source,
        maxExistingQueriesForContext: 10,
        existingQueries: [
          {
            id: 'query-1',
            title: 'Error rate',
            type: 'stats',
            severity_score: 65,
            description: 'Tracks error rate',
            esql: 'FROM $.nightshift.sources.default.checkout | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)',
          },
        ],
      })
    );
    expect(telemetry.trackSignificantEventsQueriesGenerated).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow_execution_id: 'run-1',
        parent_workflow_execution_id: 'onboarding-run-1',
        count: 1,
        connector_id: 'test-connector',
        source_id: 'source-1',
        input_tokens_used: 10,
        output_tokens_used: 20,
      })
    );
  });

  it('uses the canonical connector returned by model resolution', async () => {
    const resolveModel = jest.fn().mockResolvedValue('canonical-connector');

    await generateKIQueries(
      {
        source,
        connectorId: 'connector-alias',
        runId: 'run-1',
        maxExistingQueriesForContext: 50,
      },
      makeDeps({ resolveModel, logger })
    );

    expect(resolveModel).toHaveBeenCalledWith('connector-alias');
    expect(executeKIQueryGenerationAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'canonical-connector' })
    );
  });

  describe('when the agent fails', () => {
    const createFailureTelemetry = () => ({
      trackSignificantEventsQueriesGenerated: jest.fn(),
      trackSignificantEventsQueriesGenerationFailed: jest.fn(),
    });

    const generate = (
      telemetry: ReturnType<typeof createFailureTelemetry>,
      signal = new AbortController().signal,
      overrides: Partial<GenerateKIQueriesDependencies> = {}
    ) =>
      generateKIQueries(
        {
          source,
          connectorId: 'test-connector',
          runId: 'run-1',
          workflowExecutionId: 'run-1',
          parentWorkflowExecutionId: 'onboarding-run-1',
          maxExistingQueriesForContext: 10,
        },
        makeDeps({
          telemetry: telemetry as unknown as EbtTelemetryClient,
          logger,
          signal,
          ...overrides,
        })
      );

    it('reports a run that never finalized by that cause and still fails', async () => {
      const telemetry = createFailureTelemetry();
      const error = new KIQueryGenerationAgentError(
        'agent_did_not_finalize',
        'KI query generation agent did not finalize a query result for source checkout'
      );
      executeKIQueryGenerationAgentMock.mockRejectedValue(error);

      await expect(generate(telemetry)).rejects.toBe(error);

      expect(telemetry.trackSignificantEventsQueriesGenerationFailed).toHaveBeenCalledTimes(1);
      expect(telemetry.trackSignificantEventsQueriesGenerationFailed).toHaveBeenCalledWith({
        workflow_execution_id: 'run-1',
        parent_workflow_execution_id: 'onboarding-run-1',
        error_code: 'agent_did_not_finalize',
        connector_id: 'test-connector',
        source_id: 'source-1',
        duration_ms: expect.any(Number),
      });
      expect(telemetry.trackSignificantEventsQueriesGenerated).not.toHaveBeenCalled();
    });

    it('reports a cancelled run as aborted, not as an internal error', async () => {
      const telemetry = createFailureTelemetry();
      const controller = new AbortController();
      controller.abort();
      executeKIQueryGenerationAgentMock.mockRejectedValue(new Error('Request was aborted'));

      await expect(generate(telemetry, controller.signal)).rejects.toThrow('Request was aborted');

      expect(telemetry.trackSignificantEventsQueriesGenerationFailed).toHaveBeenCalledWith(
        expect.objectContaining({ error_code: 'aborted' })
      );
    });

    it('reports any other failure as an internal error', async () => {
      const telemetry = createFailureTelemetry();
      executeKIQueryGenerationAgentMock.mockRejectedValue(new Error('connector timeout'));

      await expect(generate(telemetry)).rejects.toThrow('connector timeout');

      expect(telemetry.trackSignificantEventsQueriesGenerationFailed).toHaveBeenCalledWith(
        expect.objectContaining({ error_code: 'internal_error' })
      );
    });

    it('reports model resolution failures without an unresolved connector id', async () => {
      const telemetry = createFailureTelemetry();
      const resolveModel = jest.fn().mockRejectedValue(new Error('model resolution failed'));

      await expect(
        generate(telemetry, new AbortController().signal, { resolveModel })
      ).rejects.toThrow('model resolution failed');

      const [[reported]] = telemetry.trackSignificantEventsQueriesGenerationFailed.mock.calls;
      expect(reported).toEqual(expect.objectContaining({ error_code: 'internal_error' }));
      expect(reported).not.toHaveProperty('connector_id');
      expect(executeKIQueryGenerationAgentMock).not.toHaveBeenCalled();
    });

    it('reports failures while loading existing queries', async () => {
      const telemetry = createFailureTelemetry();
      const kiClient = {
        getSourceToQueryLinksMap: jest.fn().mockRejectedValue(new Error('query read failed')),
      } as unknown as GenerateKIQueriesDependencies['kiClient'];

      await expect(generate(telemetry, new AbortController().signal, { kiClient })).rejects.toThrow(
        'query read failed'
      );

      expect(telemetry.trackSignificantEventsQueriesGenerationFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          error_code: 'internal_error',
          connector_id: 'test-connector',
        })
      );
      expect(executeKIQueryGenerationAgentMock).not.toHaveBeenCalled();
    });

    it('fails with the agent error when telemetry throws', async () => {
      const telemetry = createFailureTelemetry();
      telemetry.trackSignificantEventsQueriesGenerationFailed.mockImplementation(() => {
        throw new Error('analytics down');
      });
      executeKIQueryGenerationAgentMock.mockRejectedValue(new Error('connector timeout'));

      await expect(generate(telemetry)).rejects.toThrow('connector timeout');

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to track query generation failure: analytics down'
      );
    });
  });
});
