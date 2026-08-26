/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { writeGenerationStartedEvent } from '.';

const mockWriteAttackDiscoveryEvent = jest.fn();

jest.mock('../../persistence/event_logging', () => ({
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED: 'generation-started',
  writeAttackDiscoveryEvent: (...args: unknown[]) => mockWriteAttackDiscoveryEvent(...args),
}));

describe('writeGenerationStartedEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not include workflowRunId', async () => {
    await writeGenerationStartedEvent({
      authenticatedUser: {} as never,
      connectorId: 'test-connector-id',
      eventLogger: {} as never,
      eventLogIndex: '.kibana-event-log-test',
      executionUuid: 'test-execution-uuid',
      loadingMessage: 'loading...',
      spaceId: 'default',
      workflowId: 'attack-discovery-generation',
    });

    const [firstCallArgs] = mockWriteAttackDiscoveryEvent.mock.calls[0];

    expect(firstCallArgs).not.toHaveProperty('workflowRunId');
  });

  it('writes generation-started action', async () => {
    await writeGenerationStartedEvent({
      authenticatedUser: {} as never,
      connectorId: 'test-connector-id',
      eventLogger: {} as never,
      eventLogIndex: '.kibana-event-log-test',
      executionUuid: 'test-execution-uuid',
      loadingMessage: 'loading...',
      spaceId: 'default',
      workflowId: 'attack-discovery-generation',
    });

    expect(mockWriteAttackDiscoveryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'generation-started',
      })
    );
  });
});
