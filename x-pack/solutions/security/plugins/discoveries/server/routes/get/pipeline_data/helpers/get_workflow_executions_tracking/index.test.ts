/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  DiagnosticsContext,
  WorkflowExecutionsTracking,
} from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';

import { getWorkflowExecutionsTracking } from '.';

const mockSearch = jest.fn();

const esClient = {
  search: mockSearch,
} as unknown as ElasticsearchClient;

const eventLogIndex = '.kibana-event-log-test';
const executionId = 'test-execution-uuid-123';

const validTracking: WorkflowExecutionsTracking = {
  alertRetrieval: [
    {
      workflowId: 'workflow-default-alert-retrieval',
      workflowRunId: 'alert-retrieval-run-id',
    },
  ],
  generation: {
    workflowId: 'workflow-generation',
    workflowRunId: 'generation-run-id',
  },
  validation: {
    workflowId: 'workflow-validate',
    workflowRunId: 'validation-run-id',
  },
};

describe('getWorkflowExecutionsTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns WorkflowExecutionsTracking when event.reference is found', async () => {
    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              event: {
                reference: JSON.stringify(validTracking),
              },
            },
          },
        ],
        total: { value: 1 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).toEqual(validTracking);
  });

  it('returns null when no events are found', async () => {
    mockSearch.mockResolvedValue({
      hits: {
        hits: [],
        total: { value: 0 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).toBeNull();
  });

  it('returns null when event.reference is missing from the hit', async () => {
    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              event: {
                action: 'generation-started',
              },
            },
          },
        ],
        total: { value: 1 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).toBeNull();
  });

  it('returns null when event.reference is not valid JSON', async () => {
    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              event: {
                reference: 'not-valid-json',
              },
            },
          },
        ],
        total: { value: 1 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).toBeNull();
  });

  it('queries the correct index and filters', async () => {
    mockSearch.mockResolvedValue({
      hits: {
        hits: [],
        total: { value: 0 },
      },
    });

    await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        index: eventLogIndex,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              { term: { 'event.provider': 'securitySolution.attackDiscovery' } },
              { term: { 'kibana.alert.rule.execution.uuid': executionId } },
              { exists: { field: 'event.reference' } },
            ]),
          }),
        }),
      })
    );
  });

  it('returns tracking with null alertRetrieval', async () => {
    const trackingWithNullAlertRetrieval: WorkflowExecutionsTracking = {
      alertRetrieval: null,
      generation: {
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      },
      validation: null,
    };

    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              event: {
                reference: JSON.stringify(trackingWithNullAlertRetrieval),
              },
            },
          },
        ],
        total: { value: 1 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).toEqual(trackingWithNullAlertRetrieval);
  });

  it('returns tracking with multiple alert retrieval workflows', async () => {
    const trackingWithMultipleRetrieval: WorkflowExecutionsTracking = {
      alertRetrieval: [
        {
          workflowId: 'workflow-legacy',
          workflowRunId: 'legacy-run-id',
        },
        {
          workflowId: 'workflow-custom-esql',
          workflowRunId: 'custom-esql-run-id',
        },
      ],
      generation: {
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      },
      validation: {
        workflowId: 'workflow-validate',
        workflowRunId: 'validation-run-id',
      },
    };

    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              event: {
                reference: JSON.stringify(trackingWithMultipleRetrieval),
              },
            },
          },
        ],
        total: { value: 1 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).toEqual(trackingWithMultipleRetrieval);
  });

  it('merges alertRetrieval from multiple events (default + failed custom workflow)', async () => {
    // Custom workflow fails first → writes event with only its own alertRetrieval
    const customFailedEvent = {
      alertRetrieval: [{ workflowId: 'workflow-custom', workflowRunId: 'custom-placeholder-run' }],
      generation: null,
      validation: null,
    };

    // Default workflow succeeds later → writes event with only its own alertRetrieval + generation/validation
    const defaultSuccessEvent = {
      alertRetrieval: [{ workflowId: 'workflow-default', workflowRunId: 'default-run-id' }],
      generation: { workflowId: 'workflow-generation', workflowRunId: 'generation-run-id' },
      validation: { workflowId: 'workflow-validate', workflowRunId: 'validation-run-id' },
    };

    // Hits are sorted desc by timestamp: default success event first (most recent)
    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          { _source: { event: { reference: JSON.stringify(defaultSuccessEvent) } } },
          { _source: { event: { reference: JSON.stringify(customFailedEvent) } } },
        ],
        total: { value: 2 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).not.toBeNull();
    // Both workflows must appear in alertRetrieval
    expect(result?.alertRetrieval).toHaveLength(2);
    expect(result?.alertRetrieval).toEqual(
      expect.arrayContaining([
        { workflowId: 'workflow-default', workflowRunId: 'default-run-id' },
        { workflowId: 'workflow-custom', workflowRunId: 'custom-placeholder-run' },
      ])
    );
    // generation/validation taken from the most recent event (defaultSuccessEvent)
    expect(result?.generation).toEqual({
      workflowId: 'workflow-generation',
      workflowRunId: 'generation-run-id',
    });
    expect(result?.validation).toEqual({
      workflowId: 'workflow-validate',
      workflowRunId: 'validation-run-id',
    });
  });

  it('deduplicates alertRetrieval entries with the same workflowRunId across events', async () => {
    const event1 = {
      alertRetrieval: [{ workflowId: 'workflow-default', workflowRunId: 'run-id-1' }],
      generation: null,
      validation: null,
    };
    const event2 = {
      alertRetrieval: [{ workflowId: 'workflow-default', workflowRunId: 'run-id-1' }],
      generation: null,
      validation: null,
    };

    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          { _source: { event: { reference: JSON.stringify(event1) } } },
          { _source: { event: { reference: JSON.stringify(event2) } } },
        ],
        total: { value: 2 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result?.alertRetrieval).toHaveLength(1);
    expect(result?.alertRetrieval?.[0].workflowRunId).toBe('run-id-1');
  });

  it('skips events with invalid JSON and continues merging valid events', async () => {
    const validEvent = {
      alertRetrieval: [{ workflowId: 'workflow-default', workflowRunId: 'default-run-id' }],
      generation: null,
      validation: null,
    };

    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          { _source: { event: { reference: 'not-valid-json' } } },
          { _source: { event: { reference: JSON.stringify(validEvent) } } },
        ],
        total: { value: 2 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).not.toBeNull();
    expect(result?.alertRetrieval).toHaveLength(1);
    expect(result?.alertRetrieval?.[0].workflowRunId).toBe('default-run-id');
  });

  it('returns diagnosticsContext when present in event.reference', async () => {
    const diagnosticsContext: DiagnosticsContext = {
      config: {
        alertRetrievalMode: 'default_esql',
        alertRetrievalWorkflowCount: 1,
        connectorType: '.gen-ai',
        hasCustomValidation: false,
      },
      preExecutionChecks: [
        { check: 'Connector availability', message: 'Connector is reachable', passed: true },
        {
          check: 'API key validity',
          message: 'API key is valid',
          passed: false,
          severity: 'critical',
        },
      ],
      workflowIntegrity: {
        repaired: [],
        status: 'all_intact',
        unrepairableErrors: [],
      },
    };

    const referenceWithDiagnostics = {
      ...validTracking,
      diagnosticsContext,
    };

    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              event: {
                reference: JSON.stringify(referenceWithDiagnostics),
              },
            },
          },
        ],
        total: { value: 1 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).not.toBeNull();
    expect(result?.diagnosticsContext).toEqual(diagnosticsContext);
    // Tracking fields are still present
    expect(result?.alertRetrieval).toEqual(validTracking.alertRetrieval);
    expect(result?.generation).toEqual(validTracking.generation);
    expect(result?.validation).toEqual(validTracking.validation);
  });

  it('returns diagnosticsContext from the most recent event when multiple events exist', async () => {
    const olderDiagnosticsContext: DiagnosticsContext = {
      config: {
        alertRetrievalMode: 'default_esql',
        alertRetrievalWorkflowCount: 1,
        connectorType: '.gen-ai',
        hasCustomValidation: false,
      },
      preExecutionChecks: [{ check: 'Old check', message: 'Old message', passed: true }],
      workflowIntegrity: { repaired: [], status: 'all_intact', unrepairableErrors: [] },
    };

    const newerDiagnosticsContext: DiagnosticsContext = {
      config: {
        alertRetrievalMode: 'default_esql',
        alertRetrievalWorkflowCount: 2,
        connectorType: '.gen-ai',
        hasCustomValidation: true,
      },
      preExecutionChecks: [{ check: 'New check', message: 'New message', passed: false }],
      workflowIntegrity: { repaired: [], status: 'repaired', unrepairableErrors: [] },
    };

    // Hits sorted desc by timestamp: newer event is first
    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              event: {
                reference: JSON.stringify({
                  ...validTracking,
                  diagnosticsContext: newerDiagnosticsContext,
                }),
              },
            },
          },
          {
            _source: {
              event: {
                reference: JSON.stringify({
                  ...validTracking,
                  diagnosticsContext: olderDiagnosticsContext,
                }),
              },
            },
          },
        ],
        total: { value: 2 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result?.diagnosticsContext).toEqual(newerDiagnosticsContext);
  });

  it('returns providedAlerts when present in event.reference', async () => {
    const providedAlerts = ['alert string one', 'alert string two', 'alert string three'];

    const referenceWithProvidedAlerts = {
      ...validTracking,
      providedAlerts,
    };

    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              event: {
                reference: JSON.stringify(referenceWithProvidedAlerts),
              },
            },
          },
        ],
        total: { value: 1 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).not.toBeNull();
    expect(result?.providedAlerts).toEqual(providedAlerts);
    expect(result?.alertRetrieval).toEqual(validTracking.alertRetrieval);
    expect(result?.generation).toEqual(validTracking.generation);
    expect(result?.validation).toEqual(validTracking.validation);
  });

  it('returns providedAlerts from the most recent event when multiple events exist', async () => {
    const newerProvidedAlerts = ['newer alert one', 'newer alert two'];
    const olderProvidedAlerts = ['older alert one'];

    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              event: {
                reference: JSON.stringify({
                  ...validTracking,
                  providedAlerts: newerProvidedAlerts,
                }),
              },
            },
          },
          {
            _source: {
              event: {
                reference: JSON.stringify({
                  ...validTracking,
                  providedAlerts: olderProvidedAlerts,
                }),
              },
            },
          },
        ],
        total: { value: 2 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result?.providedAlerts).toEqual(newerProvidedAlerts);
  });

  it('does not include providedAlerts when absent from event.reference', async () => {
    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              event: {
                reference: JSON.stringify(validTracking),
              },
            },
          },
        ],
        total: { value: 1 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty('providedAlerts');
  });

  it('does not include diagnosticsContext when absent from event.reference', async () => {
    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              event: {
                reference: JSON.stringify(validTracking),
              },
            },
          },
        ],
        total: { value: 1 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty('diagnosticsContext');
  });

  it('returns null when all events have invalid JSON', async () => {
    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          { _source: { event: { reference: 'bad-json-1' } } },
          { _source: { event: { reference: 'bad-json-2' } } },
        ],
        total: { value: 2 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
    });

    expect(result).toBeNull();
  });
});
