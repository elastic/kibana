/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { AuthenticatedUser } from '@kbn/core/server';
import { writeAttackDiscoveryEvent, type EventLogRefresher } from './write_attack_discovery_event';
import { ATTACK_DISCOVERY_EVENT_PROVIDER } from './constants';

describe('writeAttackDiscoveryEvent', () => {
  const mockEventLogger: jest.Mocked<IEventLogger> = {
    logEvent: jest.fn(),
  } as unknown as jest.Mocked<IEventLogger>;

  const mockDataClient: jest.Mocked<EventLogRefresher> = {
    refreshEventLogIndex: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuthenticatedUser: AuthenticatedUser = {
    username: 'test-user',
    email: 'test@example.com',
    full_name: 'Test User',
    roles: ['admin'],
    enabled: true,
    authentication_realm: { name: 'native', type: 'native' },
    lookup_realm: { name: 'native', type: 'native' },
    authentication_provider: { type: 'basic', name: 'basic1' },
    authentication_type: 'realm',
    elastic_cloud_user: false,
    metadata: {
      _reserved: false,
    },
    profile_uid: 'test-profile-uid',
  };

  const defaultParams = {
    action: 'generation-started' as const,
    authenticatedUser: mockAuthenticatedUser,
    connectorId: 'test-connector',
    dataClient: mockDataClient,
    eventLogger: mockEventLogger,
    eventLogIndex: '.kibana-event-log-*',
    executionUuid: 'test-execution-uuid',
    message: 'Test message',
    spaceId: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs event with all required fields', async () => {
    await writeAttackDiscoveryEvent(defaultParams);

    expect(mockEventLogger.logEvent).toHaveBeenCalledTimes(1);
  });

  it('includes correct event structure', async () => {
    await writeAttackDiscoveryEvent(defaultParams);

    const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

    expect(loggedEvent).toMatchObject({
      event: {
        action: 'generation-started',
        dataset: 'test-connector',
        provider: ATTACK_DISCOVERY_EVENT_PROVIDER,
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'siem',
            execution: {
              uuid: 'test-execution-uuid',
            },
          },
        },
        space_ids: ['default'],
      },
      message: 'Test message',
      tags: ['securitySolution', 'attackDiscovery'],
      user: {
        name: 'test-user',
      },
    });
  });

  it('includes metrics when alertsContextCount is provided', async () => {
    await writeAttackDiscoveryEvent({
      ...defaultParams,
      alertsContextCount: 10,
    });

    const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

    expect(loggedEvent?.kibana?.alert?.rule?.execution?.metrics).toEqual({
      alert_counts: {
        active: 10,
      },
    });
  });

  it('includes metrics when newAlerts is provided', async () => {
    await writeAttackDiscoveryEvent({
      ...defaultParams,
      newAlerts: 5,
    });

    const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

    expect(loggedEvent?.kibana?.alert?.rule?.execution?.metrics).toEqual({
      alert_counts: {
        new: 5,
      },
    });
  });

  it('includes both active and new counts in metrics', async () => {
    await writeAttackDiscoveryEvent({
      ...defaultParams,
      alertsContextCount: 10,
      newAlerts: 5,
    });

    const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

    expect(loggedEvent?.kibana?.alert?.rule?.execution?.metrics).toEqual({
      alert_counts: {
        active: 10,
        new: 5,
      },
    });
  });

  it('trims reason field if longer than 1024 characters', async () => {
    const longReason = 'a'.repeat(2000);

    await writeAttackDiscoveryEvent({
      ...defaultParams,
      reason: longReason,
    });

    const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

    expect(loggedEvent?.event?.reason).toHaveLength(1024);
  });

  it('does not trim reason field if 1024 characters or less', async () => {
    const exactReason = 'a'.repeat(1024);

    await writeAttackDiscoveryEvent({
      ...defaultParams,
      reason: exactReason,
    });

    const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

    expect(loggedEvent?.event?.reason).toBe(exactReason);
  });

  it('calls dataClient refreshEventLogIndex', async () => {
    await writeAttackDiscoveryEvent(defaultParams);

    expect(mockDataClient.refreshEventLogIndex).toHaveBeenCalledWith('.kibana-event-log-*');
  });

  it('handles null dataClient gracefully', async () => {
    await writeAttackDiscoveryEvent({
      ...defaultParams,
      dataClient: null,
    });

    expect(mockEventLogger.logEvent).toHaveBeenCalledTimes(1);
  });

  it('includes duration when provided', async () => {
    await writeAttackDiscoveryEvent({
      ...defaultParams,
      duration: 1_500_000_000,
    });

    const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

    expect(loggedEvent?.event?.duration).toBe(1_500_000_000);
  });

  describe('with start and end timestamps', () => {
    const start = new Date('2026-01-12T10:00:00.000Z');
    const end = new Date('2026-01-12T10:00:01.500Z');

    beforeEach(async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        end,
        start,
      });
    });

    it('includes start timestamp', () => {
      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

      expect(loggedEvent?.event?.start).toBe('2026-01-12T10:00:00.000Z');
    });

    it('includes end timestamp', () => {
      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

      expect(loggedEvent?.event?.end).toBe('2026-01-12T10:00:01.500Z');
    });
  });

  it('includes outcome when provided', async () => {
    await writeAttackDiscoveryEvent({
      ...defaultParams,
      outcome: 'success',
    });

    const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

    expect(loggedEvent?.event?.outcome).toBe('success');
  });

  it('includes loading message as status when provided', async () => {
    await writeAttackDiscoveryEvent({
      ...defaultParams,
      loadingMessage: 'Generating discoveries...',
    });

    const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

    expect(loggedEvent?.kibana?.alert?.rule?.execution?.status).toBe('Generating discoveries...');
  });

  describe('workflow IDs written to event.module and event.id', () => {
    it('sets event.module when workflowId is provided', async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        workflowId: 'attack-discovery-generation',
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

      expect(loggedEvent?.event?.module).toBe('attack-discovery-generation');
    });

    it('sets event.id when workflowRunId is provided', async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        workflowRunId: 'stub-abc123',
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

      expect(loggedEvent?.event?.id).toBe('stub-abc123');
    });

    it('does not set event.reference when workflowId and workflowRunId are provided', async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        workflowId: 'attack-discovery-generation',
        workflowRunId: 'stub-abc123',
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

      expect(loggedEvent?.event?.reference).toBeUndefined();
    });

    it('does not include unmapped workflow_id or workflow_run_id fields', async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        workflowId: 'attack-discovery-generation',
        workflowRunId: 'stub-abc123',
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0] as Record<string, unknown>;
      const kibana = loggedEvent?.kibana as Record<string, unknown>;
      const alert = kibana?.alert as Record<string, unknown>;
      const rule = alert?.rule as Record<string, unknown>;
      const execution = rule?.execution as Record<string, unknown>;

      // These unmapped fields should NOT be present to avoid schema warnings
      expect(execution?.workflow_id).toBeUndefined();
    });

    it('does not include unmapped workflow_run_id field', async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        workflowId: 'attack-discovery-generation',
        workflowRunId: 'stub-abc123',
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0] as Record<string, unknown>;
      const kibana = loggedEvent?.kibana as Record<string, unknown>;
      const alert = kibana?.alert as Record<string, unknown>;
      const rule = alert?.rule as Record<string, unknown>;
      const execution = rule?.execution as Record<string, unknown>;

      expect(execution?.workflow_run_id).toBeUndefined();
    });
  });

  describe('source tracking', () => {
    it('defaults source to interactive when not provided', async () => {
      await writeAttackDiscoveryEvent(defaultParams);

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

      expect(loggedEvent?.event?.category).toEqual(['interactive']);
    });

    it('persists source as event.category for interactive', async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        source: 'interactive',
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

      expect(loggedEvent?.event?.category).toEqual(['interactive']);
    });

    it('persists source as event.category for scheduled', async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        source: 'scheduled',
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

      expect(loggedEvent?.event?.category).toEqual(['scheduled']);
    });

    it('persists source as event.category for action', async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        source: 'action',
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

      expect(loggedEvent?.event?.category).toEqual(['action']);
    });
  });

  describe('errorCategory and failedWorkflowId', () => {
    it('includes errorCategory in event.reference JSON when provided', async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        errorCategory: 'workflow_disabled',
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];
      const parsed = JSON.parse(loggedEvent?.event?.reference as string);

      expect(parsed.errorCategory).toBe('workflow_disabled');
    });

    it('includes failedWorkflowId in event.reference JSON when provided', async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        failedWorkflowId: 'wf-abc123',
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];
      const parsed = JSON.parse(loggedEvent?.event?.reference as string);

      expect(parsed.failedWorkflowId).toBe('wf-abc123');
    });

    it('includes both errorCategory and failedWorkflowId in event.reference JSON when both provided', async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        errorCategory: 'timeout',
        failedWorkflowId: 'wf-gen-001',
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];
      const parsed = JSON.parse(loggedEvent?.event?.reference as string);

      expect(parsed.errorCategory).toBe('timeout');
      expect(parsed.failedWorkflowId).toBe('wf-gen-001');
    });

    it('does not include errorCategory in event.reference when not provided', async () => {
      await writeAttackDiscoveryEvent(defaultParams);

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

      expect(loggedEvent?.event?.reference).toBeUndefined();
    });

    it('coexists with workflowExecutions in event.reference', async () => {
      const workflowExecutions = {
        alertRetrieval: null,
        generation: { workflowId: 'gen-wf', workflowRunId: 'gen-run' },
        validation: null,
      };

      await writeAttackDiscoveryEvent({
        ...defaultParams,
        errorCategory: 'connector_error',
        failedWorkflowId: 'gen-wf',
        workflowExecutions,
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];
      const parsed = JSON.parse(loggedEvent?.event?.reference as string);

      expect(parsed.errorCategory).toBe('connector_error');
      expect(parsed.failedWorkflowId).toBe('gen-wf');
      expect(parsed.generation).toEqual(workflowExecutions.generation);
    });
  });

  describe('sourceMetadata', () => {
    const sourceMetadata = {
      actionExecutionUuid: 'action-exec-uuid-123',
      ruleId: 'rule-id-456',
      ruleName: 'Test Detection Rule',
    };

    it('persists sourceMetadata in event.reference as JSON', async () => {
      await writeAttackDiscoveryEvent({
        ...defaultParams,
        source: 'action',
        sourceMetadata,
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];
      const parsed = JSON.parse(loggedEvent?.event?.reference as string);

      expect(parsed.sourceMetadata).toEqual(sourceMetadata);
    });

    it('does not set event.reference when sourceMetadata is not provided and workflowExecutions is not provided', async () => {
      await writeAttackDiscoveryEvent(defaultParams);

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];

      expect(loggedEvent?.event?.reference).toBeUndefined();
    });

    it('coexists with workflowExecutions in event.reference', async () => {
      const workflowExecutions = {
        alertRetrieval: [{ workflowId: 'alert-wf', workflowRunId: 'alert-run' }],
        generation: { workflowId: 'gen-wf', workflowRunId: 'gen-run' },
        validation: null,
      };

      await writeAttackDiscoveryEvent({
        ...defaultParams,
        source: 'action',
        sourceMetadata,
        workflowExecutions,
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];
      const parsed = JSON.parse(loggedEvent?.event?.reference as string);

      expect(parsed.sourceMetadata).toEqual(sourceMetadata);
      expect(parsed.alertRetrieval).toEqual(workflowExecutions.alertRetrieval);
      expect(parsed.generation).toEqual(workflowExecutions.generation);
      expect(parsed.validation).toBeNull();
    });

    it('preserves workflowExecutions in event.reference when sourceMetadata is not provided', async () => {
      const workflowExecutions = {
        alertRetrieval: null,
        generation: { workflowId: 'gen-wf', workflowRunId: 'gen-run' },
        validation: null,
      };

      await writeAttackDiscoveryEvent({
        ...defaultParams,
        workflowExecutions,
      });

      const loggedEvent = mockEventLogger.logEvent.mock.calls[0][0];
      const parsed = JSON.parse(loggedEvent?.event?.reference as string);

      expect(parsed.generation).toEqual(workflowExecutions.generation);
      expect(parsed.sourceMetadata).toBeUndefined();
    });
  });
});
