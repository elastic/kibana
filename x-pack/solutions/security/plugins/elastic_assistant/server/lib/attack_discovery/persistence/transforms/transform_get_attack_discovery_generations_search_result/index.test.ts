/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import {
  parseErrorClassification,
  parseValidationSummary,
  transformGetAttackDiscoveryGenerationsSearchResult,
} from '.';

describe('transformGetAttackDiscoveryGenerationsSearchResult', () => {
  const logger = loggingSystemMock.createLogger();

  const workflowExecutions = {
    alertRetrieval: [
      {
        workflowId: 'alert-retrieval-workflow',
        workflowRunId: 'alert-retrieval-run',
      },
    ],
    generation: {
      workflowId: 'generation-workflow',
      workflowRunId: 'generation-run',
    },
    validation: null,
  };

  const validRawResponse = {
    aggregations: {
      generations: {
        buckets: [
          {
            key: 'exec-uuid-1',
            doc_count: 1,
            alerts_context_count: { value: 1 },
            connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
            discoveries: { value: 2 },
            event_actions: {
              buckets: [
                { key: 'alert-retrieval-started', doc_count: 1 },
                { key: 'alert-retrieval-succeeded', doc_count: 1 },
                { key: 'generate-step-started', doc_count: 1 },
                { key: 'generate-step-succeeded', doc_count: 1 },
                { key: 'generation-started', doc_count: 1 },
                { key: 'generation-succeeded', doc_count: 1 },
              ],
            },
            event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
            loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
            generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
            generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
            workflow_id: {
              buckets: [{ key: 'test-workflow-id', doc_count: 1 }],
            },
            workflow_reference: {
              buckets: [{ key: JSON.stringify(workflowExecutions), doc_count: 1 }],
            },
            workflow_run_id: {
              buckets: [{ key: 'test-workflow-run-id', doc_count: 1 }],
            },
          },
        ],
      },
    },
  };

  it('returns the expected transformed result', () => {
    const result = transformGetAttackDiscoveryGenerationsSearchResult({
      rawResponse: validRawResponse,
      logger,
    });

    expect(result.generations).toEqual([
      {
        alerts_context_count: 1,
        connector_id: 'test-connector',
        discoveries: 2,
        end: '2025-07-30T00:00:00Z',
        execution_uuid: 'exec-uuid-1',
        generation_start_time: '2025-07-29T00:00:00Z',
        loading_message: 'Loading...',
        reason: 'test-reason',
        start: '2025-07-29T00:00:00Z',
        status: 'succeeded',
        step_event_actions: ['step-start', 'step-complete', 'step-start', 'step-complete'],
        workflow_executions: workflowExecutions,
        workflow_id: 'test-workflow-id',
        workflow_run_id: 'test-workflow-run-id',
      },
    ]);
  });

  it('returns step_event_actions derived from per-step-type lifecycle counts', () => {
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-step-counts',
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
              discoveries: { value: 2 },
              event_actions: {
                buckets: [
                  { key: 'alert-retrieval-started', doc_count: 2 },
                  { key: 'alert-retrieval-succeeded', doc_count: 2 },
                  { key: 'generate-step-started', doc_count: 1 },
                  { key: 'generate-step-succeeded', doc_count: 1 },
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
              workflow_reference: {
                buckets: [{ key: 'test-workflow-id:test-workflow-run-id', doc_count: 1 }],
              },
            },
          ],
        },
      },
    };

    const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

    expect(result.generations[0].step_event_actions).toEqual([
      'step-start',
      'step-complete',
      'step-start',
      'step-complete',
    ]);
  });

  it('returns an empty array when buckets is empty', () => {
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [],
        },
      },
    };

    const result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });

    expect(result.generations).toEqual([]);
  });

  it('skips a bucket with a missing connector_id', () => {
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-2',
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [] },
              discoveries: { value: 2 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
            },
          ],
        },
      },
    };

    const result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });

    expect(result.generations.length).toBe(0);
  });

  it('throws when aggregations is missing', () => {
    // Pass the required shape but with aggregations as undefined
    const rawResponse = { aggregations: undefined };

    expect(() =>
      transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger })
    ).toThrow();
  });

  it('throws when a bucket is missing generation_start_time', () => {
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-3',
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
              discoveries: { value: 2 },
              event_actions: { buckets: [{ key: 'generation-succeeded', doc_count: 1 }] },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              // generation_start_time missing
              loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
            },
          ],
        },
      },
    };

    expect(() =>
      transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger })
    ).toThrow();
  });

  it('returns the expected generations given two valid buckets', () => {
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-1',
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
              discoveries: { value: 2 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
              workflow_id: { buckets: [] },
              workflow_run_id: { buckets: [] },
            },
            {
              key: 'exec-uuid-2',
              doc_count: 1,
              alerts_context_count: { value: 2 },
              connector_id: { buckets: [{ key: 'test-connector-2', doc_count: 1 }] },
              discoveries: { value: 3 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason-2', doc_count: 1 }] },
              loading_message: { buckets: [{ key: 'Loading2...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-31T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-30T00:00:00Z' },
              workflow_id: { buckets: [] },
              workflow_run_id: { buckets: [] },
            },
          ],
        },
      },
    };

    const result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });

    expect(result.generations).toEqual([
      {
        alerts_context_count: 1,
        connector_id: 'test-connector',
        discoveries: 2,
        end: '2025-07-30T00:00:00Z',
        execution_uuid: 'exec-uuid-1',
        generation_start_time: '2025-07-29T00:00:00Z',
        loading_message: 'Loading...',
        reason: 'test-reason',
        start: '2025-07-29T00:00:00Z',
        status: 'succeeded',
        workflow_id: undefined,
        workflow_run_id: undefined,
      },
      {
        alerts_context_count: 2,
        connector_id: 'test-connector-2',
        discoveries: 3,
        end: '2025-07-31T00:00:00Z',
        execution_uuid: 'exec-uuid-2',
        generation_start_time: '2025-07-30T00:00:00Z',
        loading_message: 'Loading2...',
        reason: 'test-reason-2',
        start: '2025-07-30T00:00:00Z',
        status: 'succeeded',
        workflow_id: undefined,
        workflow_run_id: undefined,
      },
    ]);
  });

  it('skips a bucket with a missing loading_message', () => {
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-4',
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
              discoveries: { value: 2 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              loading_message: { buckets: [] }, // empty buckets means no loading message
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
            },
          ],
        },
      },
    };

    const result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });

    expect(result.generations.length).toBe(0);
  });

  it('skips a bucket with a null executionUuid key', () => {
    // Since zod schema requires key to be string, this test should expect an error during parsing
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: null,
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
              discoveries: { value: 2 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
            },
          ],
        },
      },
    };

    expect(() =>
      transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger })
    ).toThrow('Failed to parse search results');
  });

  describe('when buckets have undefined optional fields', () => {
    let result: ReturnType<typeof transformGetAttackDiscoveryGenerationsSearchResult>;
    beforeEach(() => {
      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-5',
                doc_count: 1,
                alerts_context_count: { value: null }, // null value
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 0 }, // zero discoveries
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [] }, // no event reason
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: null }, // null instead of missing
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
              },
            ],
          },
        },
      };
      result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });
    });

    it('returns one generation', () => {
      expect(result.generations.length).toBe(1);
    });

    it('has an undefined alerts_context_count', () => {
      expect(result.generations[0].alerts_context_count).toBeUndefined();
    });

    it('has zero discoveries', () => {
      expect(result.generations[0].discoveries).toBe(0);
    });

    it('has an undefined reason', () => {
      expect(result.generations[0].reason).toBeUndefined();
    });

    it('has an undefined end', () => {
      expect(result.generations[0].end).toBeUndefined();
    });
  });

  describe('handles mixed valid and invalid buckets', () => {
    let result: ReturnType<typeof transformGetAttackDiscoveryGenerationsSearchResult>;
    beforeEach(() => {
      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              // Valid bucket
              {
                key: 'exec-uuid-valid',
                doc_count: 1,
                alerts_context_count: { value: 1 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 2 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
              },
              // Invalid bucket: missing connector_id
              {
                key: 'exec-uuid-invalid',
                doc_count: 1,
                alerts_context_count: { value: 1 },
                connector_id: { buckets: [] },
                discoveries: { value: 2 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
              },
            ],
          },
        },
      };
      result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });
    });

    it('returns only one generation', () => {
      expect(result.generations.length).toBe(1);
    });

    it('has execution_uuid of exec-uuid-valid', () => {
      expect(result.generations[0].execution_uuid).toBe('exec-uuid-valid');
    });
  });

  it('verifies that debug logs are called for skipped buckets', () => {
    const mockLogger = loggingSystemMock.createLogger();
    const rawResponse = {
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-debug-test',
              doc_count: 1,
              alerts_context_count: { value: 1 },
              connector_id: { buckets: [] }, // missing connector_id will cause skip
              discoveries: { value: 2 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
              loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
            },
          ],
        },
      },
    };

    transformGetAttackDiscoveryGenerationsSearchResult({
      rawResponse,
      logger: mockLogger,
    });

    expect(mockLogger.debug).toHaveBeenCalled();
  });

  describe('when workflow IDs are missing', () => {
    let result: ReturnType<typeof transformGetAttackDiscoveryGenerationsSearchResult>;
    beforeEach(() => {
      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-no-workflow',
                doc_count: 1,
                alerts_context_count: { value: 1 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 2 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
                workflow_id: { buckets: [] },
                workflow_run_id: { buckets: [] },
              },
            ],
          },
        },
      };
      result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });
    });

    it('returns one generation', () => {
      expect(result.generations.length).toBe(1);
    });

    it('has an undefined workflow_id', () => {
      expect(result.generations[0].workflow_id).toBeUndefined();
    });

    it('has an undefined workflow_run_id', () => {
      expect(result.generations[0].workflow_run_id).toBeUndefined();
    });
  });

  describe('handles different generation statuses based on event actions', () => {
    let result: ReturnType<typeof transformGetAttackDiscoveryGenerationsSearchResult>;
    beforeEach(() => {
      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              // Test "started" status (only generation-started action)
              {
                key: 'exec-uuid-running',
                doc_count: 1,
                alerts_context_count: { value: 1 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 0 },
                event_actions: {
                  buckets: [{ key: 'generation-started', doc_count: 1 }], // only started, not completed
                },
                event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: null },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
              },
              // Test "canceled" status
              {
                key: 'exec-uuid-canceled',
                doc_count: 1,
                alerts_context_count: { value: 1 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 0 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-canceled', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
              },
            ],
          },
        },
      };
      result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });
    });

    it('returns two generations', () => {
      expect(result.generations.length).toBe(2);
    });

    it('has status "started" for exec-uuid-running', () => {
      const runningGeneration = result.generations.find(
        (g) => g.execution_uuid === 'exec-uuid-running'
      );

      expect(runningGeneration?.status).toBe('started');
    });

    it('has status "canceled" for exec-uuid-canceled', () => {
      const canceledGeneration = result.generations.find(
        (g) => g.execution_uuid === 'exec-uuid-canceled'
      );

      expect(canceledGeneration?.status).toBe('canceled');
    });
  });

  describe('merging workflow_reference buckets', () => {
    it('merges multiple workflow_reference buckets into complete WorkflowExecutionsTracking', () => {
      // Simulates real-world scenario: each event writes partial data
      const partialBucket1 = JSON.stringify({
        alertRetrieval: [
          {
            workflowId: 'alert-retrieval-workflow',
            workflowRunId: 'real-alert-run-123',
          },
        ],
        generation: null,
        validation: null,
      });

      const partialBucket2 = JSON.stringify({
        alertRetrieval: null,
        generation: {
          workflowId: 'generation-workflow',
          workflowRunId: 'real-orch-run-456',
        },
        validation: null,
      });

      const partialBucket3 = JSON.stringify({
        alertRetrieval: null,
        generation: null,
        validation: {
          workflowId: 'validation-workflow',
          workflowRunId: 'real-validation-run-789',
        },
      });

      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-merge-test',
                doc_count: 3,
                alerts_context_count: { value: 10 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 3 }] },
                discoveries: { value: 5 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 3 }] },
                generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
                workflow_id: { buckets: [{ key: 'generation-workflow', doc_count: 3 }] },
                workflow_run_id: { buckets: [{ key: 'real-orch-run-456', doc_count: 3 }] },
                workflow_reference: {
                  buckets: [
                    { key: partialBucket1, doc_count: 1 },
                    { key: partialBucket2, doc_count: 1 },
                    { key: partialBucket3, doc_count: 1 },
                  ],
                },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });

      expect(result.generations[0].workflow_executions).toEqual({
        alertRetrieval: [
          {
            workflowId: 'alert-retrieval-workflow',
            workflowRunId: 'real-alert-run-123',
          },
        ],
        generation: {
          workflowId: 'generation-workflow',
          workflowRunId: 'real-orch-run-456',
        },
        validation: {
          workflowId: 'validation-workflow',
          workflowRunId: 'real-validation-run-789',
        },
      });
    });

    it('prefers real IDs over stub IDs when merging', () => {
      // First bucket has stub ID, second bucket has real ID
      const stubBucket = JSON.stringify({
        alertRetrieval: null,
        generation: {
          workflowId: 'generation-workflow',
          workflowRunId: 'stub-fake-id-123',
        },
        validation: null,
      });

      const realBucket = JSON.stringify({
        alertRetrieval: null,
        generation: {
          workflowId: 'generation-workflow',
          workflowRunId: 'real-orch-run-456',
        },
        validation: null,
      });

      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-prefer-real',
                doc_count: 2,
                alerts_context_count: { value: 10 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 2 }] },
                discoveries: { value: 5 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 2 }] },
                generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
                workflow_id: { buckets: [{ key: 'generation-workflow', doc_count: 2 }] },
                workflow_run_id: { buckets: [{ key: 'stub-fake-id-123', doc_count: 2 }] },
                workflow_reference: {
                  buckets: [
                    { key: stubBucket, doc_count: 1 }, // stub comes first
                    { key: realBucket, doc_count: 1 }, // real comes second
                  ],
                },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });

      // Should prefer the real ID over the stub ID
      expect(result.generations[0].workflow_executions?.generation?.workflowRunId).toBe(
        'real-orch-run-456'
      );
    });

    it('handles invalid JSON in workflow_reference buckets gracefully', () => {
      const validBucket = JSON.stringify({
        alertRetrieval: [
          {
            workflowId: 'alert-retrieval-workflow',
            workflowRunId: 'real-alert-run-123',
          },
        ],
        generation: null,
        validation: null,
      });

      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-invalid-json',
                doc_count: 2,
                alerts_context_count: { value: 10 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 2 }] },
                discoveries: { value: 5 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 2 }] },
                generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
                workflow_id: { buckets: [{ key: 'generation-workflow', doc_count: 2 }] },
                workflow_run_id: { buckets: [{ key: 'run-123', doc_count: 2 }] },
                workflow_reference: {
                  buckets: [
                    { key: 'not-valid-json{{{', doc_count: 1 }, // invalid JSON
                    { key: validBucket, doc_count: 1 }, // valid JSON
                  ],
                },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ rawResponse, logger });

      // Should still extract the valid bucket data
      expect(result.generations[0].workflow_executions?.alertRetrieval?.[0]?.workflowRunId).toBe(
        'real-alert-run-123'
      );
    });
  });

  describe('parseValidationSummary', () => {
    it('extracts all fields when all are present', () => {
      const parsed = {
        validationSummary: {
          duplicatesDroppedCount: 3,
          filterReason: 'some reason',
          generatedCount: 10,
          hallucinationsFilteredCount: 2,
          persistedCount: 5,
        },
      };

      expect(parseValidationSummary(parsed)).toEqual({
        duplicatesDroppedCount: 3,
        generatedCount: 10,
        hallucinationsFilteredCount: 2,
        persistedCount: 5,
      });
    });

    it('extracts only required fields when optional fields are absent', () => {
      const parsed = {
        validationSummary: {
          generatedCount: 8,
          persistedCount: 6,
        },
      };

      expect(parseValidationSummary(parsed)).toEqual({
        generatedCount: 8,
        persistedCount: 6,
      });
    });

    it('returns null when validationSummary is missing', () => {
      expect(parseValidationSummary({ workflowExecutions: {} })).toBeNull();
    });

    it('returns null when parsed is not a record', () => {
      expect(parseValidationSummary(null)).toBeNull();
      expect(parseValidationSummary(undefined)).toBeNull();
      expect(parseValidationSummary('string')).toBeNull();
      expect(parseValidationSummary(42)).toBeNull();
    });

    it('returns null when validationSummary is not a record', () => {
      expect(parseValidationSummary({ validationSummary: 'invalid' })).toBeNull();
      expect(parseValidationSummary({ validationSummary: null })).toBeNull();
      expect(parseValidationSummary({ validationSummary: 42 })).toBeNull();
    });

    it('returns null when required fields (generatedCount, persistedCount) are missing', () => {
      expect(
        parseValidationSummary({ validationSummary: { duplicatesDroppedCount: 1 } })
      ).toBeNull();
    });

    it('returns null when required fields are not numbers', () => {
      expect(
        parseValidationSummary({
          validationSummary: { generatedCount: 'ten', persistedCount: 5 },
        })
      ).toBeNull();
    });

    it('omits optional fields that are not numbers', () => {
      const parsed = {
        validationSummary: {
          duplicatesDroppedCount: 'not-a-number',
          generatedCount: 10,
          hallucinationsFilteredCount: null,
          persistedCount: 8,
        },
      };

      expect(parseValidationSummary(parsed)).toEqual({
        generatedCount: 10,
        persistedCount: 8,
      });
    });
  });

  describe('validation summary fields in transform output', () => {
    const buildRawResponseWithReference = (referenceJson: unknown) => ({
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-summary',
              doc_count: 1,
              alerts_context_count: { value: 20 },
              connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
              discoveries: { value: 7 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-succeeded', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [] },
              loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-08-01T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-31T00:00:00Z' },
              workflow_reference: {
                buckets: [{ key: JSON.stringify(referenceJson), doc_count: 1 }],
              },
            },
          ],
        },
      },
    });

    it('includes all 4 summary fields when all are present in event.reference', () => {
      const rawResponse = buildRawResponseWithReference({
        validationSummary: {
          duplicatesDroppedCount: 3,
          generatedCount: 10,
          hallucinationsFilteredCount: 2,
          persistedCount: 5,
        },
      });

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      expect(result.generations[0].duplicates_dropped_count).toBe(3);
      expect(result.generations[0].generated_count).toBe(10);
      expect(result.generations[0].hallucinations_filtered_count).toBe(2);
      expect(result.generations[0].persisted_count).toBe(5);
    });

    it('includes only required summary fields when optional fields are absent', () => {
      const rawResponse = buildRawResponseWithReference({
        validationSummary: {
          generatedCount: 8,
          persistedCount: 6,
        },
      });

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      expect(result.generations[0].generated_count).toBe(8);
      expect(result.generations[0].persisted_count).toBe(6);
      expect(result.generations[0].duplicates_dropped_count).toBeUndefined();
      expect(result.generations[0].hallucinations_filtered_count).toBeUndefined();
    });

    it('returns undefined summary fields for old-format events without validationSummary', () => {
      const rawResponse = buildRawResponseWithReference({
        alertRetrieval: null,
        generation: { workflowId: 'gen-wf', workflowRunId: 'gen-run-1' },
        validation: null,
      });

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      expect(result.generations[0].duplicates_dropped_count).toBeUndefined();
      expect(result.generations[0].generated_count).toBeUndefined();
      expect(result.generations[0].hallucinations_filtered_count).toBeUndefined();
      expect(result.generations[0].persisted_count).toBeUndefined();
    });

    it('returns undefined summary fields when workflow_reference is absent', () => {
      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-no-ref',
                doc_count: 1,
                alerts_context_count: { value: 5 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 3 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: '2025-08-01T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-31T00:00:00Z' },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      expect(result.generations[0].duplicates_dropped_count).toBeUndefined();
      expect(result.generations[0].generated_count).toBeUndefined();
      expect(result.generations[0].hallucinations_filtered_count).toBeUndefined();
      expect(result.generations[0].persisted_count).toBeUndefined();
    });

    it('returns the last non-null validationSummary when multiple buckets are present', () => {
      const bucket1 = JSON.stringify({
        validationSummary: { generatedCount: 5, persistedCount: 3 },
      });
      const bucket2 = JSON.stringify({
        validationSummary: {
          duplicatesDroppedCount: 2,
          generatedCount: 10,
          hallucinationsFilteredCount: 1,
          persistedCount: 7,
        },
      });

      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-multi-buckets',
                doc_count: 2,
                alerts_context_count: { value: 20 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 2 }] },
                discoveries: { value: 7 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 2 }] },
                generation_end_time: { value_as_string: '2025-08-01T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-31T00:00:00Z' },
                workflow_reference: {
                  buckets: [
                    { key: bucket1, doc_count: 1 },
                    { key: bucket2, doc_count: 1 },
                  ],
                },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      // Last non-null summary (bucket2) wins
      expect(result.generations[0].generated_count).toBe(10);
      expect(result.generations[0].persisted_count).toBe(7);
      expect(result.generations[0].duplicates_dropped_count).toBe(2);
      expect(result.generations[0].hallucinations_filtered_count).toBe(1);
    });
  });

  describe('parseErrorClassification', () => {
    it('extracts errorCategory when present', () => {
      const parsed = { errorCategory: 'generation' };

      expect(parseErrorClassification(parsed)).toEqual({ errorCategory: 'generation' });
    });

    it('extracts failedWorkflowId when present', () => {
      const parsed = { failedWorkflowId: 'wf-abc-123' };

      expect(parseErrorClassification(parsed)).toEqual({ failedWorkflowId: 'wf-abc-123' });
    });

    it('extracts both fields when both are present', () => {
      const parsed = { errorCategory: 'validation', failedWorkflowId: 'wf-xyz-456' };

      expect(parseErrorClassification(parsed)).toEqual({
        errorCategory: 'validation',
        failedWorkflowId: 'wf-xyz-456',
      });
    });

    it('returns null when neither errorCategory nor failedWorkflowId is present', () => {
      expect(parseErrorClassification({ validationSummary: {} })).toBeNull();
    });

    it('returns null when parsed is not a record', () => {
      expect(parseErrorClassification(null)).toBeNull();
      expect(parseErrorClassification(undefined)).toBeNull();
      expect(parseErrorClassification('string')).toBeNull();
      expect(parseErrorClassification(42)).toBeNull();
    });

    it('omits errorCategory when it is not a string', () => {
      const parsed = { errorCategory: 123, failedWorkflowId: 'wf-abc' };

      expect(parseErrorClassification(parsed)).toEqual({ failedWorkflowId: 'wf-abc' });
    });

    it('omits failedWorkflowId when it is not a string', () => {
      const parsed = { errorCategory: 'generation', failedWorkflowId: null };

      expect(parseErrorClassification(parsed)).toEqual({ errorCategory: 'generation' });
    });
  });

  describe('error classification fields in transform output', () => {
    const buildRawResponseWithReference = (referenceJson: unknown) => ({
      aggregations: {
        generations: {
          buckets: [
            {
              key: 'exec-uuid-error-class',
              doc_count: 1,
              alerts_context_count: { value: 5 },
              connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
              discoveries: { value: 0 },
              event_actions: {
                buckets: [
                  { key: 'generation-started', doc_count: 1 },
                  { key: 'generation-failed', doc_count: 1 },
                ],
              },
              event_reason: { buckets: [{ key: 'failed', doc_count: 1 }] },
              loading_message: { buckets: [{ key: 'Failed...', doc_count: 1 }] },
              generation_end_time: { value_as_string: '2025-08-01T00:00:00Z' },
              generation_start_time: { value_as_string: '2025-07-31T00:00:00Z' },
              workflow_reference: {
                buckets: [{ key: JSON.stringify(referenceJson), doc_count: 1 }],
              },
            },
          ],
        },
      },
    });

    it('includes error_category in the response when errorCategory is in event.reference', () => {
      const rawResponse = buildRawResponseWithReference({ errorCategory: 'generation' });

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      expect(result.generations[0].error_category).toBe('generation');
    });

    it('includes failed_workflow_id in the response when failedWorkflowId is in event.reference', () => {
      const rawResponse = buildRawResponseWithReference({ failedWorkflowId: 'wf-abc-123' });

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      expect(result.generations[0].failed_workflow_id).toBe('wf-abc-123');
    });

    it('includes both error_category and failed_workflow_id when both are present', () => {
      const rawResponse = buildRawResponseWithReference({
        errorCategory: 'validation',
        failedWorkflowId: 'wf-xyz-456',
      });

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      expect(result.generations[0].error_category).toBe('validation');
      expect(result.generations[0].failed_workflow_id).toBe('wf-xyz-456');
    });

    it('returns undefined error fields for legacy events without structured error data', () => {
      const rawResponse = buildRawResponseWithReference({
        alertRetrieval: null,
        generation: { workflowId: 'gen-wf', workflowRunId: 'gen-run-1' },
        validation: null,
      });

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      expect(result.generations[0].error_category).toBeUndefined();
      expect(result.generations[0].failed_workflow_id).toBeUndefined();
    });

    it('returns undefined error fields when workflow_reference is absent', () => {
      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-no-ref',
                doc_count: 1,
                alerts_context_count: { value: 5 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 0 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-failed', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [] },
                loading_message: { buckets: [{ key: 'Failed...', doc_count: 1 }] },
                generation_end_time: { value_as_string: '2025-08-01T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-31T00:00:00Z' },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      expect(result.generations[0].error_category).toBeUndefined();
      expect(result.generations[0].failed_workflow_id).toBeUndefined();
    });

    it('returns the last non-null error classification when multiple buckets are present', () => {
      const bucket1 = JSON.stringify({ errorCategory: 'alert_retrieval' });
      const bucket2 = JSON.stringify({
        errorCategory: 'generation',
        failedWorkflowId: 'wf-final-789',
      });

      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-multi-buckets-err',
                doc_count: 2,
                alerts_context_count: { value: 5 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 2 }] },
                discoveries: { value: 0 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-failed', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [] },
                loading_message: { buckets: [{ key: 'Failed...', doc_count: 2 }] },
                generation_end_time: { value_as_string: '2025-08-01T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-31T00:00:00Z' },
                workflow_reference: {
                  buckets: [
                    { key: bucket1, doc_count: 1 },
                    { key: bucket2, doc_count: 1 },
                  ],
                },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      // Last non-null classification (bucket2) wins
      expect(result.generations[0].error_category).toBe('generation');
      expect(result.generations[0].failed_workflow_id).toBe('wf-final-789');
    });

    it('gracefully handles malformed JSON in workflow_reference bucket', () => {
      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-bad-json',
                doc_count: 1,
                alerts_context_count: { value: 5 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 0 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-failed', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [] },
                loading_message: { buckets: [{ key: 'Failed...', doc_count: 1 }] },
                generation_end_time: { value_as_string: '2025-08-01T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-31T00:00:00Z' },
                workflow_reference: {
                  buckets: [{ key: 'not-valid-json{{{', doc_count: 1 }],
                },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      expect(result.generations[0].error_category).toBeUndefined();
      expect(result.generations[0].failed_workflow_id).toBeUndefined();
    });
  });

  describe('backward compatibility with legacy promotion names', () => {
    it('counts legacy promotion-started/promotion-succeeded in step_event_actions', () => {
      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-legacy-promotion',
                doc_count: 1,
                alerts_context_count: { value: 1 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 2 },
                event_actions: {
                  buckets: [
                    { key: 'alert-retrieval-started', doc_count: 1 },
                    { key: 'alert-retrieval-succeeded', doc_count: 1 },
                    { key: 'generate-step-started', doc_count: 1 },
                    { key: 'generate-step-succeeded', doc_count: 1 },
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                    { key: 'promotion-started', doc_count: 1 },
                    { key: 'promotion-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
                workflow_reference: {
                  buckets: [{ key: 'test-workflow-id:test-workflow-run-id', doc_count: 1 }],
                },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      expect(result.generations[0].step_event_actions).toEqual([
        'step-start',
        'step-complete',
        'step-start',
        'step-complete',
        'step-start',
        'step-complete',
      ]);
    });

    it('parses legacy promotion key in workflow_reference', () => {
      const legacyWorkflowExecutions = JSON.stringify({
        alertRetrieval: null,
        generation: null,
        promotion: {
          workflowId: 'legacy-promotion-workflow',
          workflowRunId: 'legacy-promo-run-123',
        },
      });

      const rawResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                key: 'exec-uuid-legacy-ref',
                doc_count: 1,
                alerts_context_count: { value: 1 },
                connector_id: { buckets: [{ key: 'test-connector', doc_count: 1 }] },
                discoveries: { value: 2 },
                event_actions: {
                  buckets: [
                    { key: 'generation-started', doc_count: 1 },
                    { key: 'generation-succeeded', doc_count: 1 },
                  ],
                },
                event_reason: { buckets: [{ key: 'test-reason', doc_count: 1 }] },
                loading_message: { buckets: [{ key: 'Loading...', doc_count: 1 }] },
                generation_end_time: { value_as_string: '2025-07-30T00:00:00Z' },
                generation_start_time: { value_as_string: '2025-07-29T00:00:00Z' },
                workflow_reference: {
                  buckets: [{ key: legacyWorkflowExecutions, doc_count: 1 }],
                },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({ logger, rawResponse });

      expect(result.generations[0].workflow_executions?.validation).toEqual({
        workflowId: 'legacy-promotion-workflow',
        workflowRunId: 'legacy-promo-run-123',
      });
    });
  });
});
