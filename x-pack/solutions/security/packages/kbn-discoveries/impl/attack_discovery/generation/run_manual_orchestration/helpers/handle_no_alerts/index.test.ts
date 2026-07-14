/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';

import type { AlertRetrievalResult } from '../../../invoke_alert_retrieval_workflow';
import { handleNoAlerts } from '.';

const mockWriteAttackDiscoveryEvent = jest.fn();

jest.mock('../../../../persistence/event_logging', () => ({
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED: 'generation-succeeded',
  writeAttackDiscoveryEvent: (...args: unknown[]) => mockWriteAttackDiscoveryEvent(...args),
}));

const alertRetrievalResult: AlertRetrievalResult = {
  alerts: [],
  alertsContextCount: 0,
  anonymizedAlerts: [],
  apiConfig: {
    action_type_id: '.gen-ai',
    connector_id: 'connector-1',
    model: 'gpt-4',
  },
  connectorName: 'Test Connector',
  replacements: {},
  workflowExecutions: [{ workflowId: 'retrieval', workflowRunId: 'retrieval-run' }],
  workflowId: 'retrieval',
  workflowRunId: 'retrieval-run',
};

const defaultProps = {
  alertRetrievalResult,
  apiConfig: {
    action_type_id: '.gen-ai',
    connector_id: 'connector-1',
    model: 'gpt-4',
  },
  authenticatedUser: { username: 'test-user' } as AuthenticatedUser,
  eventLogger: { logEvent: jest.fn() } as unknown as IEventLogger,
  eventLogIndex: '.kibana-event-log-test',
  executionUuid: 'exec-1',
  generationWorkflowId: 'generation',
  logger: { error: jest.fn(), info: jest.fn() } as unknown as Logger,
  spaceId: 'default',
  startTime: new Date('2024-01-01T00:00:00.000Z'),
};

describe('handleNoAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a no_alerts outcome', async () => {
    const result = await handleNoAlerts(defaultProps);

    expect(result.outcome).toBe('no_alerts');
  });

  it('returns the alert retrieval result on the outcome', async () => {
    const result = await handleNoAlerts(defaultProps);

    expect(result.alertRetrievalResult).toBe(alertRetrievalResult);
  });

  it('writes a generation-succeeded event so the UI reaches a terminal state', async () => {
    await handleNoAlerts(defaultProps);

    expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'generation-succeeded',
        outcome: 'success',
      })
    );
  });

  it('reports zero alerts on the generation-succeeded event', async () => {
    await handleNoAlerts(defaultProps);

    expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        alertsContextCount: 0,
      })
    );
  });

  it('does not throw when event writing fails', async () => {
    mockWriteAttackDiscoveryEvent.mockRejectedValueOnce(new Error('boom'));

    await expect(handleNoAlerts(defaultProps)).resolves.toEqual(
      expect.objectContaining({ outcome: 'no_alerts' })
    );
  });
});
