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
const spaceId = 'default';
const username = 'test-user';

const validTracking: WorkflowExecutionsTracking = {
  alertRetrieval: [
    {
      workflowId: 'workflow-default-alert-retrieval',
      workflowRunId: 'alert-retrieval-run-id',
    },
  ],
  gate: null,
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
      spaceId,
      username,
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
      spaceId,
      username,
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
      spaceId,
      username,
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
      spaceId,
      username,
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
      spaceId,
      username,
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        index: eventLogIndex,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              { term: { 'event.provider': 'securitySolution.attackDiscovery' } },
              { term: { 'kibana.alert.rule.execution.uuid': executionId } },
              { term: { 'kibana.space_ids': spaceId } },
              { term: { 'user.name': username } },
            ]),
          }),
        }),
      })
    );
  });

  it('scopes the query to the requesting principal via user.name (object-level authz)', async () => {
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
      spaceId,
      username,
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([{ term: { 'user.name': username } }]),
          }),
        }),
      })
    );
  });

  it('returns tracking with null alertRetrieval', async () => {
    const trackingWithNullAlertRetrieval: WorkflowExecutionsTracking = {
      alertRetrieval: null,
      gate: null,
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
      spaceId,
      username,
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
      gate: null,
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
      spaceId,
      username,
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
      spaceId,
      username,
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

  it('surfaces the generation-phase gate executions from event.reference', async () => {
    const eventWithGate = {
      alertRetrieval: [{ workflowId: 'workflow-default', workflowRunId: 'default-run-id' }],
      gate: [{ workflowId: 'workflow-gate', workflowRunId: 'gate-run-id' }],
      generation: { workflowId: 'workflow-generation', workflowRunId: 'generation-run-id' },
      validation: null,
    };

    mockSearch.mockResolvedValue({
      hits: {
        hits: [{ _source: { event: { reference: JSON.stringify(eventWithGate) } } }],
        total: { value: 1 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
      spaceId,
      username,
    });

    expect(result?.gate).toEqual([{ workflowId: 'workflow-gate', workflowRunId: 'gate-run-id' }]);
    // gate executions must NOT leak into alertRetrieval
    expect(result?.alertRetrieval).toEqual([
      { workflowId: 'workflow-default', workflowRunId: 'default-run-id' },
    ]);
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
      spaceId,
      username,
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
      spaceId,
      username,
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
      spaceId,
      username,
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
      spaceId,
      username,
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
      spaceId,
      username,
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
      spaceId,
      username,
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
      spaceId,
      username,
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
      spaceId,
      username,
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
      spaceId,
      username,
    });

    expect(result).toBeNull();
  });

  describe('when an event reference is too large to be indexed', () => {
    /**
     * `event.reference` is a `keyword` with `ignore_above`, so a reference larger
     * than the limit stays in `_source` but is never indexed. The
     * generate-step-started event embeds the provided alerts, routinely exceeds the
     * limit, and is the only event carrying the generation run id.
     */
    const oversizedGenerateStepReference = JSON.stringify({
      alertRetrieval: null,
      gate: null,
      generation: {
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      },
      providedAlerts: [`@timestamp,2026-09-17T02:04:33.324Z\n${'a'.repeat(200_000)}`],
      validation: null,
    });

    const gateOnlyReference = JSON.stringify({
      alertRetrieval: null,
      gate: [
        {
          workflowId: 'system-attack-discovery-skill-alert-retrieval',
          workflowRunId: 'gate-run-id',
        },
      ],
      generation: null,
      validation: null,
    });

    beforeEach(() => {
      // Model Elasticsearch: a hit whose `event.reference` exceeds `ignore_above` is
      // returned only when the query does NOT filter on `exists: event.reference`,
      // because the field was never indexed. Sorted descending by timestamp, so the
      // oversized generate-step event is first.
      mockSearch.mockImplementation(({ query }) => {
        const requiresIndexedReference = query.bool.filter.some(
          (clause: Record<string, unknown>) =>
            (clause.exists as { field?: string } | undefined)?.field === 'event.reference'
        );

        const hits = [
          ...(requiresIndexedReference
            ? []
            : [{ _source: { event: { reference: oversizedGenerateStepReference } } }]),
          { _source: { event: { reference: gateOnlyReference } } },
        ];

        return Promise.resolve({ hits: { hits, total: { value: hits.length } } });
      });
    });

    it('does not require event.reference to be indexed', async () => {
      await getWorkflowExecutionsTracking({
        esClient,
        eventLogIndex,
        executionId,
        spaceId,
        username,
      });

      const { query } = mockSearch.mock.calls[0][0];

      expect(query.bool.filter).not.toContainEqual({
        exists: { field: 'event.reference' },
      });
    });

    it('surfaces the generation run id from the oversized reference', async () => {
      const result = await getWorkflowExecutionsTracking({
        esClient,
        eventLogIndex,
        executionId,
        spaceId,
        username,
      });

      expect(result?.generation).toEqual({
        workflowId: 'workflow-generation',
        workflowRunId: 'generation-run-id',
      });
    });

    it('still merges tracking from the other events', async () => {
      const result = await getWorkflowExecutionsTracking({
        esClient,
        eventLogIndex,
        executionId,
        spaceId,
        username,
      });

      expect(result?.gate).toEqual([
        {
          workflowId: 'system-attack-discovery-skill-alert-retrieval',
          workflowRunId: 'gate-run-id',
        },
      ]);
    });
  });

  it('skips events whose reference was dropped by the index, without failing the lookup', async () => {
    // A hit with no `event.reference` at all: previously excluded by the query, now
    // reduced over and skipped, so one unusable event cannot hide a whole execution.
    mockSearch.mockResolvedValue({
      hits: {
        hits: [
          { _source: { event: {} } },
          { _source: { event: { reference: JSON.stringify(validTracking) } } },
        ],
        total: { value: 2 },
      },
    });

    const result = await getWorkflowExecutionsTracking({
      esClient,
      eventLogIndex,
      executionId,
      spaceId,
      username,
    });

    expect(result?.generation).toEqual(validTracking.generation);
  });
});
