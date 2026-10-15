/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_ENABLED_SETTING_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '@kbn/alertzero-common';
import { workerRegistry, type WorkerRegistration } from '../../managed_workflows/worker_registry';
import { collectSpaceSnapshot } from './collect_space_snapshot';
import { readInstalledWorker } from './read_installed_worker';

jest.mock('./read_installed_worker', () => ({
  readInstalledWorker: jest.fn(),
}));

const readInstalledWorkerMock = jest.mocked(readInstalledWorker);

const getRegistration = (id: string): WorkerRegistration => {
  const registration = workerRegistry.get(id);
  if (!registration) {
    throw new Error(`${id} is not registered`);
  }
  return registration;
};

const REGISTRATIONS = [
  getRegistration(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID),
  getRegistration(SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID),
];

const createUiSettingsClient = (values: Record<string, unknown>) => ({
  get: jest.fn(async (key: string) => values[key]),
});

const managedWorkflows = {
  getInstalledWorkflowState: jest.fn(),
  getWorkflowStatus: jest.fn(),
};

describe('collectSpaceSnapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readInstalledWorkerMock.mockResolvedValue(undefined);
  });

  it('reads both advanced settings from the space and takes the deployment-wide flag as given', async () => {
    const uiSettingsClient = createUiSettingsClient({
      [ALERTZERO_ENABLED_SETTING_ID]: true,
      'securitySolution:enableAttackDiscoveryWorkflows': false,
    });

    const snapshot = await collectSpaceSnapshot({
      attackDiscoveryWorkflowsEnabled: true,
      managedWorkflows,
      registrations: REGISTRATIONS,
      spaceId: 'space-a',
      uiSettingsClient,
    });

    expect(snapshot.flags).toEqual({
      'securitySolution.attackDiscoveryWorkflowsEnabled': true,
      'securitySolution:enableAlertZero': true,
      'securitySolution:enableAttackDiscoveryWorkflows': false,
    });
    expect(uiSettingsClient.get.mock.calls.map(([key]) => key).sort()).toEqual([
      'securitySolution:enableAlertZero',
      'securitySolution:enableAttackDiscoveryWorkflows',
    ]);
  });

  it('treats an unset or non-boolean setting as disabled', async () => {
    const snapshot = await collectSpaceSnapshot({
      attackDiscoveryWorkflowsEnabled: false,
      managedWorkflows,
      registrations: REGISTRATIONS,
      spaceId: 'space-a',
      uiSettingsClient: createUiSettingsClient({ [ALERTZERO_ENABLED_SETTING_ID]: 'true' }),
    });

    expect(Object.values(snapshot.flags)).toEqual([false, false, false]);
  });

  it('collects the installed Workers of the space and drops the rest', async () => {
    readInstalledWorkerMock.mockImplementation(async ({ registration }) =>
      registration.id === SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID
        ? { autonomyLevel: 'assisted', enabled: true, workerId: registration.id }
        : undefined
    );

    const snapshot = await collectSpaceSnapshot({
      attackDiscoveryWorkflowsEnabled: false,
      managedWorkflows,
      registrations: REGISTRATIONS,
      spaceId: 'space-a',
      uiSettingsClient: createUiSettingsClient({}),
    });

    expect(snapshot.workers).toEqual([
      {
        autonomyLevel: 'assisted',
        enabled: true,
        workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      },
    ]);
    expect(readInstalledWorkerMock.mock.calls.map(([params]) => params)).toEqual(
      REGISTRATIONS.map((registration) => ({ managedWorkflows, registration, spaceId: 'space-a' }))
    );
  });

  it('defaults to every registered Worker', async () => {
    await collectSpaceSnapshot({
      attackDiscoveryWorkflowsEnabled: false,
      managedWorkflows,
      spaceId: 'space-a',
      uiSettingsClient: createUiSettingsClient({}),
    });

    expect(readInstalledWorkerMock.mock.calls.map(([{ registration }]) => registration.id)).toEqual(
      workerRegistry.list().map(({ id }) => id)
    );
  });

  it('reads the flags but no Workers without managed workflows (service accounts off)', async () => {
    const snapshot = await collectSpaceSnapshot({
      attackDiscoveryWorkflowsEnabled: true,
      registrations: REGISTRATIONS,
      spaceId: 'space-a',
      uiSettingsClient: createUiSettingsClient({ [ALERTZERO_ENABLED_SETTING_ID]: true }),
    });

    expect(snapshot).toEqual({
      flags: {
        'securitySolution.attackDiscoveryWorkflowsEnabled': true,
        'securitySolution:enableAlertZero': true,
        'securitySolution:enableAttackDiscoveryWorkflows': false,
      },
      workers: [],
    });
    expect(readInstalledWorkerMock).not.toHaveBeenCalled();
  });

  it('rejects when a read fails, so the caller can leave the space out', async () => {
    readInstalledWorkerMock.mockRejectedValue(new Error('es down'));

    await expect(
      collectSpaceSnapshot({
        attackDiscoveryWorkflowsEnabled: false,
        managedWorkflows,
        registrations: REGISTRATIONS,
        spaceId: 'space-a',
        uiSettingsClient: createUiSettingsClient({}),
      })
    ).rejects.toThrow('es down');
  });
});
