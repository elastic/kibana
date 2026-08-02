/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryApiAlert } from '@kbn/elastic-assistant-common';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';

import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';
import { findAttackDiscoveryAlerts } from '../../../../get/conversations/helpers/find_attack_discovery_alerts';
import { resolveEmitDetectionChangeTarget } from '.';

jest.mock('../../../../get/conversations/helpers/find_attack_discovery_alerts');

const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.MockedFunction<
  typeof findAttackDiscoveryAlerts
>;

const request = httpServerMock.createKibanaRequest();
const http = {} as never;

const floorExecution = (overrides: Record<string, unknown> = {}) => ({
  context: { event: { attackDiscoveryAlertId: 'ad-1' } },
  id: 'run-1',
  workflowId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  ...overrides,
});

const createManagementClient = (execution: unknown) =>
  ({
    getWorkflowExecution: jest.fn().mockResolvedValue(execution),
  } as unknown as WatchWorkflowsManagementClient);

const resolve = (overrides: Record<string, unknown> = {}) =>
  resolveEmitDetectionChangeTarget({
    correlationId: 'ad-1',
    http,
    managementClient: createManagementClient(floorExecution()),
    request,
    sourceRunId: 'run-1',
    spaceId: 'agent-3',
    ...overrides,
  });

describe('resolveEmitDetectionChangeTarget', () => {
  beforeEach(() => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      { id: 'ad-1' } as unknown as AttackDiscoveryApiAlert,
    ]);
  });

  it('resolves a Floor run whose event matches the claimed discovery', async () => {
    const result = await resolve();

    expect(result).toEqual({
      event: { attackDiscoveryAlertId: 'ad-1' },
      status: 'ok',
    });
  });

  it('fetches the execution in the request space (S9)', async () => {
    const managementClient = createManagementClient(floorExecution());

    await resolve({ managementClient });

    expect(managementClient.getWorkflowExecution).toHaveBeenCalledWith('run-1', 'agent-3');
  });

  it('returns not_found when the execution is absent', async () => {
    const result = await resolve({ managementClient: createManagementClient(null) });

    expect(result.status).toBe('not_found');
  });

  it('rejects a run that is not the Watch Floor', async () => {
    const result = await resolve({
      managementClient: createManagementClient(
        floorExecution({ workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID })
      ),
    });

    expect(result.status).toBe('forbidden_workflow');
  });

  it('rejects a Floor run whose event names a different discovery', async () => {
    const result = await resolve({
      managementClient: createManagementClient(
        floorExecution({ context: { event: { attackDiscoveryAlertId: 'ad-other' } } })
      ),
    });

    expect(result.status).toBe('correlation_mismatch');
  });

  it('rejects when the caller cannot read the discovery (S3)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);

    const result = await resolve();

    expect(result.status).toBe('unreadable_discovery');
  });

  it('resolves the discovery as the calling user', async () => {
    await resolve();

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith({
      http,
      ids: ['ad-1'],
      request,
      spaceId: 'agent-3',
    });
  });
});
