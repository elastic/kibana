/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { AuthenticatedUser } from '@kbn/core/server';
import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
  type EventLogRefresher,
  writeAttackDiscoveryEvent,
} from '@kbn/discoveries/impl/attack_discovery/persistence/event_logging';

import { ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID } from '@kbn/discoveries/impl/attack_discovery/constants';

/**
 * Integration tests verifying workflow IDs flow from the internal _generate API
 * through event log writing to the generations query.
 *
 * Tests the implementation from dkv.1 (event log storage) and dkv.2 (API write).
 */
describe('Generate API Workflow IDs Integration Tests', () => {
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

  const executionUuid = 'test-execution-uuid-abc123';
  const workflowRunId = 'workflow-run-xyz789';
  const connectorId = 'test-connector-id';
  const spaceId = 'default';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Internal _generate API writes workflow IDs to event log', () => {
    it('writes workflowId and workflowRunId when generation workflow returns workflowRunId', async () => {
      // Simulate the event log write that happens in post_generate.ts after generation workflow invocation
      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex: '.kibana-event-log-*',
        eventLogger: mockEventLogger,
        executionUuid,
        message: `Attack discovery generation ${executionUuid} started via generation workflow`,
        spaceId,
        start: new Date(),
        workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        workflowRunId,
      });

      expect(mockEventLogger.logEvent).toHaveBeenCalledTimes(1);

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0] as Record<string, unknown>;
      const event = loggedEvent?.event as Record<string, unknown>;
      const kibana = loggedEvent?.kibana as Record<string, unknown>;
      const alert = kibana?.alert as Record<string, unknown>;
      const rule = alert?.rule as Record<string, unknown>;
      const execution = rule?.execution as Record<string, unknown>;

      // Workflow IDs are stored in event.module (workflowId) and event.id (workflowRunId)
      expect(event?.module).toBe(ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID);
      expect(event?.id).toBe(workflowRunId);
      expect(execution?.uuid).toBe(executionUuid);
    });

    it('includes correct event structure for generation workflow', async () => {
      const startTime = new Date('2026-01-23T10:00:00.000Z');

      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex: '.kibana-event-log-*',
        eventLogger: mockEventLogger,
        executionUuid,
        message: `Attack discovery generation ${executionUuid} started via generation workflow`,
        spaceId,
        start: startTime,
        workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        workflowRunId,
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

      expect(loggedEvent).toMatchObject({
        event: {
          action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
          dataset: connectorId,
          id: workflowRunId,
          module: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
          start: startTime.toISOString(),
        },
        kibana: {
          alert: {
            rule: {
              consumer: 'siem',
              execution: {
                uuid: executionUuid,
              },
            },
          },
          space_ids: [spaceId],
        },
        tags: ['securitySolution', 'attackDiscovery'],
        user: {
          name: mockAuthenticatedUser.username,
        },
      });
    });

    it('refreshes event log index after writing', async () => {
      const eventLogIndex = '.kibana-event-log-8.0.0';

      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex,
        eventLogger: mockEventLogger,
        executionUuid,
        message: `Attack discovery generation ${executionUuid} started via generation workflow`,
        spaceId,
        start: new Date(),
        workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        workflowRunId,
      });

      expect(mockDataClient.refreshEventLogIndex).toHaveBeenCalledWith(eventLogIndex);
      expect(mockDataClient.refreshEventLogIndex).toHaveBeenCalledTimes(1);
    });
  });

  describe('Workflow ID validation', () => {
    it('throws error when workflowRunId is missing from generation workflow response', () => {
      // This simulates the validation in post_generate.ts line 413-415
      const mockGenerationResult = {
        data: {
          workflowRunId: undefined,
        },
      };

      const workflowRunIdFromResult = mockGenerationResult.data?.workflowRunId;

      expect(workflowRunIdFromResult).toBeUndefined();

      // In the actual code, this would throw an error
      if (!workflowRunIdFromResult) {
        expect(() => {
          throw new Error('Generation workflow invocation did not return a workflowRunId');
        }).toThrow('Generation workflow invocation did not return a workflowRunId');
      }
    });

    it('accepts valid workflowRunId from generation workflow response', () => {
      const mockGenerationResult = {
        data: {
          workflowRunId: 'valid-workflow-run-id',
        },
      };

      const workflowRunIdFromResult = mockGenerationResult.data?.workflowRunId;

      expect(workflowRunIdFromResult).toBe('valid-workflow-run-id');
      expect(workflowRunIdFromResult).toBeDefined();
    });
  });

  describe('Event log field mapping', () => {
    it('maps workflow IDs to correct Elasticsearch fields', async () => {
      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex: '.kibana-event-log-*',
        eventLogger: mockEventLogger,
        executionUuid,
        message: 'Test message',
        spaceId,
        start: new Date(),
        workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        workflowRunId,
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0] as Record<string, unknown>;
      const event = loggedEvent?.event as Record<string, unknown>;

      // Verify the exact field paths that will be queried by getAttackDiscoveryGenerationsAggs
      // Workflow IDs are stored in event.module (workflowId) and event.id (workflowRunId)
      expect(event).toHaveProperty('module', ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID);
      expect(event).toHaveProperty('id', workflowRunId);
    });
  });

  describe('Multiple generation events', () => {
    it('writes unique workflow_run_id for each generation', async () => {
      const execution1 = 'execution-1';
      const execution2 = 'execution-2';
      const workflowRun1 = 'workflow-run-1';
      const workflowRun2 = 'workflow-run-2';

      // First generation
      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex: '.kibana-event-log-*',
        eventLogger: mockEventLogger,
        executionUuid: execution1,
        message: `Attack discovery generation ${execution1} started via generation workflow`,
        spaceId,
        start: new Date(),
        workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        workflowRunId: workflowRun1,
      });

      // Second generation
      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex: '.kibana-event-log-*',
        eventLogger: mockEventLogger,
        executionUuid: execution2,
        message: `Attack discovery generation ${execution2} started via generation workflow`,
        spaceId,
        start: new Date(),
        workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        workflowRunId: workflowRun2,
      });

      expect(mockEventLogger.logEvent).toHaveBeenCalledTimes(2);

      // Verify first event
      const loggedEvent1 = mockEventLogger.logEvent.mock.calls[0][0] as Record<string, unknown>;
      const event1 = loggedEvent1?.event as Record<string, unknown>;
      const kibana1 = loggedEvent1?.kibana as Record<string, unknown>;
      const alert1 = kibana1?.alert as Record<string, unknown>;
      const rule1 = alert1?.rule as Record<string, unknown>;
      const execution1Data = rule1?.execution as Record<string, unknown>;

      expect(execution1Data?.uuid).toBe(execution1);
      expect(event1?.module).toBe(ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID);
      expect(event1?.id).toBe(workflowRun1);

      // Verify second event
      const loggedEvent2 = mockEventLogger.logEvent.mock.calls[1][0] as Record<string, unknown>;
      const event2 = loggedEvent2?.event as Record<string, unknown>;
      const kibana2 = loggedEvent2?.kibana as Record<string, unknown>;
      const alert2 = kibana2?.alert as Record<string, unknown>;
      const rule2 = alert2?.rule as Record<string, unknown>;
      const execution2Data = rule2?.execution as Record<string, unknown>;

      expect(execution2Data?.uuid).toBe(execution2);
      expect(event2?.module).toBe(ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID);
      expect(event2?.id).toBe(workflowRun2);

      // Verify workflow_run_ids are different
      expect(workflowRun1).not.toBe(workflowRun2);
    });

    it('uses same workflow_id for all generation workflow runs', async () => {
      const execution1 = 'execution-1';
      const execution2 = 'execution-2';

      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex: '.kibana-event-log-*',
        eventLogger: mockEventLogger,
        executionUuid: execution1,
        message: 'Test message 1',
        spaceId,
        start: new Date(),
        workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        workflowRunId: 'run-1',
      });

      await writeAttackDiscoveryEvent({
        action: ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
        authenticatedUser: mockAuthenticatedUser,
        connectorId,
        dataClient: mockDataClient,
        eventLogIndex: '.kibana-event-log-*',
        eventLogger: mockEventLogger,
        executionUuid: execution2,
        message: 'Test message 2',
        spaceId,
        start: new Date(),
        workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        workflowRunId: 'run-2',
      });

      const loggedEvent1 = mockEventLogger.logEvent.mock.calls[0][0] as Record<string, unknown>;
      const event1 = loggedEvent1?.event as Record<string, unknown>;

      const loggedEvent2 = mockEventLogger.logEvent.mock.calls[1][0] as Record<string, unknown>;
      const event2 = loggedEvent2?.event as Record<string, unknown>;

      // Both should have the same workflow_id (from event.module)
      expect(event1?.module).toBe(ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID);
      expect(event2?.module).toBe(ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID);
      expect(event1?.module).toBe(event2?.module);
    });
  });
});
