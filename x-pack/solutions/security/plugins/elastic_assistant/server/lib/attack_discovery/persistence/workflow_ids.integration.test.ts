/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { AuthenticatedUser } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
  type EventLogRefresher,
  writeAttackDiscoveryEvent,
} from '@kbn/discoveries';

import { getAttackDiscoveryGenerationsAggs } from './get_attack_discovery_generations_aggs';
import { transformGetAttackDiscoveryGenerationsSearchResult } from './transforms/transform_get_attack_discovery_generations_search_result';

/**
 * Integration tests verifying workflow_run_id and workflow_id flow through the system:
 * 1. Event log write (via writeAttackDiscoveryEvent)
 * 2. Event log query (via getAttackDiscoveryGenerationsAggs)
 * 3. Generations API response (via transformGetAttackDiscoveryGenerationsSearchResult)
 *
 * NOTE: Workflow execution tracking is decoded from JSON in `event.reference`.
 * New workflow fields are written to `event.module` (workflowId) and `event.id` (workflowRunId).
 */
describe('Workflow IDs Integration Tests', () => {
  const mockLogger = loggingSystemMock.createLogger();
  const mockEventLogger: jest.Mocked<IEventLogger> = {
    logEvent: jest.fn(),
  } as unknown as jest.Mocked<IEventLogger>;

  const mockDataClient: jest.Mocked<EventLogRefresher> = {
    refreshEventLogIndex: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuthenticatedUser: AuthenticatedUser = {
    authentication_provider: { name: 'basic', type: 'basic' },
    authentication_realm: { name: 'native', type: 'native' },
    authentication_type: 'realm',
    elastic_cloud_user: false,
    email: 'test@example.com',
    enabled: true,
    full_name: 'Test User',
    lookup_realm: { name: 'native', type: 'native' },
    metadata: {
      _reserved: false,
    },
    profile_uid: 'test-profile-uid',
    roles: ['admin'],
    username: 'test-user',
  };

  const executionUuid = 'test-execution-uuid';
  const workflowId = 'attack-discovery-generation';
  const workflowRunId = 'test-workflow-run-id-12345';
  const connectorId = 'test-connector-id';
  const spaceId = 'default';
  const workflowExecutions = {
    alertRetrieval: [
      {
        workflowId: 'alert-retrieval-workflow',
        workflowRunId: 'alert-retrieval-run',
      },
    ],
    generation: {
      workflowId,
      workflowRunId,
    },
    validation: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event log write with workflow IDs', () => {
    it('writes workflow_id and workflow_run_id to event log', async () => {
      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex: '.kibana-event-log-*',
        eventLogger: mockEventLogger,
        executionUuid,
        message: 'Test generation started',
        spaceId,
        start: new Date(),
        workflowId,
        workflowRunId,
      });

      expect(mockEventLogger.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            id: workflowRunId,
            module: workflowId,
          }),
        })
      );
    });

    it('writes event with workflow_id only', async () => {
      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex: '.kibana-event-log-*',
        eventLogger: mockEventLogger,
        executionUuid,
        message: 'Test generation started',
        spaceId,
        start: new Date(),
        workflowId,
      });

      expect(mockEventLogger.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            module: workflowId,
          }),
        })
      );
    });

    it('writes event without workflow IDs', async () => {
      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex: '.kibana-event-log-*',
        eventLogger: mockEventLogger,
        executionUuid,
        message: 'Test generation started',
        spaceId,
        start: new Date(),
      });

      expect(mockEventLogger.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            id: undefined,
            module: undefined,
          }),
        })
      );
    });
  });

  describe('Event log query includes workflow ID fields', () => {
    it('includes workflow_id, workflow_run_id, and workflow_reference in aggregation query', () => {
      const query = getAttackDiscoveryGenerationsAggs(10);

      expect(query.aggs?.generations).toBeDefined();

      const generationsAggs = query.aggs?.generations as Record<string, unknown>;
      const aggs = generationsAggs.aggs as Record<string, unknown>;

      expect(aggs).toMatchObject({
        workflow_id: {
          terms: {
            field: 'event.module',
          },
        },
        workflow_reference: {
          terms: {
            field: 'event.reference',
          },
        },
        workflow_run_id: {
          terms: {
            field: 'event.id',
          },
        },
      });
    });
  });

  describe('Generations API response includes workflow IDs', () => {
    it('returns workflow execution tracking in generation response', () => {
      const mockSearchResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                alerts_context_count: { value: 10 },
                connector_id: { buckets: [{ doc_count: 1, key: connectorId }] },
                discoveries: { value: 3 },
                doc_count: 1,
                event_actions: {
                  buckets: [
                    { doc_count: 1, key: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED },
                  ],
                },
                event_reason: { buckets: [] },
                generation_end_time: { value_as_string: undefined },
                generation_start_time: { value_as_string: '2026-01-23T10:00:00.000Z' },
                key: executionUuid,
                loading_message: { buckets: [{ doc_count: 1, key: 'Generating discoveries...' }] },
                workflow_id: { buckets: [{ doc_count: 1, key: workflowId }] },
                workflow_reference: {
                  buckets: [{ doc_count: 1, key: JSON.stringify(workflowExecutions) }],
                },
                workflow_run_id: { buckets: [{ doc_count: 1, key: workflowRunId }] },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({
        logger: mockLogger,
        rawResponse: mockSearchResponse,
      });

      expect(result.generations).toHaveLength(1);
      expect(result.generations[0].workflow_executions).toEqual(workflowExecutions);
      expect(result.generations[0].workflow_id).toBe(workflowId);
      expect(result.generations[0].workflow_run_id).toBe(workflowRunId);
    });

    it('returns undefined workflow IDs when not present in event log', () => {
      const mockSearchResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                alerts_context_count: { value: 10 },
                connector_id: { buckets: [{ doc_count: 1, key: connectorId }] },
                discoveries: { value: 3 },
                doc_count: 1,
                event_actions: {
                  buckets: [
                    { doc_count: 1, key: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED },
                  ],
                },
                event_reason: { buckets: [] },
                generation_end_time: { value_as_string: undefined },
                generation_start_time: { value_as_string: '2026-01-23T10:00:00.000Z' },
                key: executionUuid,
                loading_message: { buckets: [{ doc_count: 1, key: 'Generating discoveries...' }] },
                workflow_reference: { buckets: [] },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({
        logger: mockLogger,
        rawResponse: mockSearchResponse,
      });

      expect(result.generations).toHaveLength(1);
      expect(result.generations[0].workflow_id).toBeUndefined();
      expect(result.generations[0].workflow_run_id).toBeUndefined();
    });

    it('returns only workflow_id when workflow_run_id is not present', () => {
      const mockSearchResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                alerts_context_count: { value: 10 },
                connector_id: { buckets: [{ doc_count: 1, key: connectorId }] },
                discoveries: { value: 3 },
                doc_count: 1,
                event_actions: {
                  buckets: [
                    { doc_count: 1, key: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED },
                  ],
                },
                event_reason: { buckets: [] },
                generation_end_time: { value_as_string: undefined },
                generation_start_time: { value_as_string: '2026-01-23T10:00:00.000Z' },
                key: executionUuid,
                loading_message: { buckets: [{ doc_count: 1, key: 'Generating discoveries...' }] },
                workflow_reference: { buckets: [] },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({
        logger: mockLogger,
        rawResponse: mockSearchResponse,
      });

      expect(result.generations).toHaveLength(1);
      expect(result.generations[0].workflow_id).toBeUndefined();
      expect(result.generations[0].workflow_run_id).toBeUndefined();
    });
  });

  describe('End-to-end workflow ID flow', () => {
    it('flows workflow IDs from event log write through to API response', async () => {
      // Step 1: Write event with workflow IDs
      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex: '.kibana-event-log-*',
        eventLogger: mockEventLogger,
        executionUuid,
        message: 'Test generation started',
        spaceId,
        start: new Date(),
        workflowId,
        workflowRunId,
      });

      // Verify event was logged with workflow IDs
      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0] as Record<string, unknown>;
      const event = loggedEvent?.event as Record<string, unknown>;

      expect(event?.module).toBe(workflowId);
      expect(event?.id).toBe(workflowRunId);

      // Step 2: Verify query includes workflow ID fields
      const query = getAttackDiscoveryGenerationsAggs(10);
      const generationsAggs = query.aggs?.generations as Record<string, unknown>;
      const aggs = generationsAggs.aggs as Record<string, unknown>;

      expect(aggs?.workflow_id).toBeDefined();
      expect(aggs?.workflow_run_id).toBeDefined();
      expect(aggs?.workflow_reference).toBeDefined();

      // Step 3: Simulate search response and verify transformation
      const mockSearchResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                alerts_context_count: { value: 10 },
                connector_id: { buckets: [{ doc_count: 1, key: connectorId }] },
                discoveries: { value: 3 },
                doc_count: 1,
                event_actions: {
                  buckets: [
                    { doc_count: 1, key: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED },
                  ],
                },
                event_reason: { buckets: [] },
                generation_end_time: { value_as_string: undefined },
                generation_start_time: { value_as_string: '2026-01-23T10:00:00.000Z' },
                key: executionUuid,
                loading_message: { buckets: [{ doc_count: 1, key: 'Generating discoveries...' }] },
                workflow_id: { buckets: [{ doc_count: 1, key: workflowId }] },
                workflow_reference: {
                  buckets: [{ doc_count: 1, key: `${workflowId}:${workflowRunId}` }],
                },
                workflow_run_id: { buckets: [{ doc_count: 1, key: workflowRunId }] },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({
        logger: mockLogger,
        rawResponse: mockSearchResponse,
      });

      // Verify workflow IDs are present in final API response
      expect(result.generations).toHaveLength(1);
      expect(result.generations[0].execution_uuid).toBe(executionUuid);
      expect(result.generations[0].workflow_id).toBe(workflowId);
      expect(result.generations[0].workflow_run_id).toBe(workflowRunId);
      expect(result.generations[0].connector_id).toBe(connectorId);
    });

    it('handles missing workflow IDs throughout the flow', async () => {
      // Step 1: Write event without workflow IDs
      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex: '.kibana-event-log-*',
        eventLogger: mockEventLogger,
        executionUuid,
        message: 'Test generation started',
        spaceId,
        start: new Date(),
      });

      // Verify event was logged without workflow IDs
      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0] as Record<string, unknown>;
      const event = loggedEvent?.event as Record<string, unknown>;

      expect(event?.reference).toBeUndefined();

      // Step 2: Simulate search response without workflow IDs
      const mockSearchResponse = {
        aggregations: {
          generations: {
            buckets: [
              {
                alerts_context_count: { value: 10 },
                connector_id: { buckets: [{ doc_count: 1, key: connectorId }] },
                discoveries: { value: 3 },
                doc_count: 1,
                event_actions: {
                  buckets: [
                    { doc_count: 1, key: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED },
                  ],
                },
                event_reason: { buckets: [] },
                generation_end_time: { value_as_string: undefined },
                generation_start_time: { value_as_string: '2026-01-23T10:00:00.000Z' },
                key: executionUuid,
                loading_message: { buckets: [{ doc_count: 1, key: 'Generating discoveries...' }] },
                workflow_reference: { buckets: [] },
              },
            ],
          },
        },
      };

      const result = transformGetAttackDiscoveryGenerationsSearchResult({
        logger: mockLogger,
        rawResponse: mockSearchResponse,
      });

      // Verify workflow IDs are undefined in final API response
      expect(result.generations).toHaveLength(1);
      expect(result.generations[0].execution_uuid).toBe(executionUuid);
      expect(result.generations[0].workflow_id).toBeUndefined();
      expect(result.generations[0].workflow_run_id).toBeUndefined();
      expect(result.generations[0].connector_id).toBe(connectorId);
    });
  });
});
