/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import { AttackDiscoveryCreatedTriggerId } from '../../../common/workflow_triggers/attack_discovery_created';
import { emitAttackDiscoveryCreatedEvent } from '.';

describe('emitAttackDiscoveryCreatedEvent', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const request = httpServerMock.createKibanaRequest();

  const basePayload = {
    alertIds: ['alert-1', 'alert-2'],
    attackDiscoveryAlertId: 'discovery-1',
    generationUuid: 'generation-1',
    riskScore: 42,
    spaceId: 'default',
  };

  const createWorkflowsExtensions = (emitEvent: jest.Mock) =>
    ({
      getClient: jest.fn().mockResolvedValue({
        emitEvent,
        isWorkflowsAvailable: true,
        managedWorkflows: {},
      }),
    } as unknown as WorkflowsExtensionsServerPluginStart);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets the workflows client with the provided request', async () => {
    const emitEvent = jest.fn().mockResolvedValue(undefined);
    const workflowsExtensions = createWorkflowsExtensions(emitEvent);

    await emitAttackDiscoveryCreatedEvent({
      logger: mockLogger,
      payload: basePayload,
      request,
      workflowsExtensions,
    });

    expect(workflowsExtensions.getClient).toHaveBeenCalledWith(request);
  });

  it('emits the trigger id and content payload', async () => {
    const emitEvent = jest.fn().mockResolvedValue(undefined);
    const workflowsExtensions = createWorkflowsExtensions(emitEvent);

    await emitAttackDiscoveryCreatedEvent({
      logger: mockLogger,
      payload: basePayload,
      request,
      workflowsExtensions,
    });

    expect(emitEvent).toHaveBeenCalledWith(AttackDiscoveryCreatedTriggerId, {
      alertIds: ['alert-1', 'alert-2'],
      attackDiscoveryAlertId: 'discovery-1',
      generationUuid: 'generation-1',
      riskScore: 42,
      spaceId: 'default',
    });
  });

  it('omits riskScore from the payload when it is undefined', async () => {
    const emitEvent = jest.fn().mockResolvedValue(undefined);
    const workflowsExtensions = createWorkflowsExtensions(emitEvent);

    await emitAttackDiscoveryCreatedEvent({
      logger: mockLogger,
      payload: { ...basePayload, riskScore: undefined },
      request,
      workflowsExtensions,
    });

    expect(emitEvent).toHaveBeenCalledWith(AttackDiscoveryCreatedTriggerId, {
      alertIds: ['alert-1', 'alert-2'],
      attackDiscoveryAlertId: 'discovery-1',
      generationUuid: 'generation-1',
      spaceId: 'default',
    });
  });

  it('does nothing when workflowsExtensions is undefined', async () => {
    await emitAttackDiscoveryCreatedEvent({
      logger: mockLogger,
      payload: basePayload,
      request,
      workflowsExtensions: undefined,
    });

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('swallows and warns when getClient rejects (never throws)', async () => {
    const workflowsExtensions = {
      getClient: jest.fn().mockRejectedValue(new Error('client boom')),
    } as unknown as WorkflowsExtensionsServerPluginStart;

    await expect(
      emitAttackDiscoveryCreatedEvent({
        logger: mockLogger,
        payload: basePayload,
        request,
        workflowsExtensions,
      })
    ).resolves.toBeUndefined();

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('client boom'));
  });

  it('swallows and warns when emitEvent rejects (never throws)', async () => {
    const emitEvent = jest.fn().mockRejectedValue(new Error('emit boom'));
    const workflowsExtensions = createWorkflowsExtensions(emitEvent);

    await expect(
      emitAttackDiscoveryCreatedEvent({
        logger: mockLogger,
        payload: basePayload,
        request: request as KibanaRequest,
        workflowsExtensions,
      })
    ).resolves.toBeUndefined();

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('emit boom'));
  });
});
