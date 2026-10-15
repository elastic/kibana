/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID } from '@kbn/alertzero-common';
import type { ManagedWorkflowStatusReport } from '@kbn/workflows/server/types';
import { workerRegistry, type WorkerRegistration } from '../../managed_workflows/worker_registry';
import { readInstalledWorker } from './read_installed_worker';

const getRegistration = (): WorkerRegistration => {
  const registration = workerRegistry.get(SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID);
  if (!registration) {
    throw new Error('the Attack Discovery Worker is not registered');
  }
  return registration;
};

const supervisedValues = () => {
  const registration = getRegistration();
  const applied = registration.settings.applyPatch(registration.settings.createDefaultValues(), {
    autonomy: 'supervised',
  });
  if ('invalid' in applied) {
    throw new Error(applied.invalid);
  }
  return applied.values;
};

const status = (
  overrides: Partial<ManagedWorkflowStatusReport> = {}
): ManagedWorkflowStatusReport => ({
  definitionId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  enabled: true,
  installed: true,
  managedBy: 'alertzero',
  registryHash: 'hash',
  registryVersion: 1,
  spaceId: 'space-a',
  status: 'intact',
  storedHash: 'hash',
  storedVersion: 1,
  valid: true,
  workflowId: `${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}-space-a`,
  ...overrides,
});

const createManagedWorkflows = ({
  statusReport = status(),
  templateValues = supervisedValues(),
}: {
  statusReport?: ManagedWorkflowStatusReport;
  templateValues?: Record<string, unknown> | null;
} = {}) => ({
  getInstalledWorkflowState: jest.fn().mockResolvedValue({
    definitionId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    documentVersion: 3,
    spaceId: 'space-a',
    templateValues,
    workflowId: statusReport.workflowId,
  }),
  getWorkflowStatus: jest.fn().mockResolvedValue(statusReport),
});

describe('readInstalledWorker', () => {
  it('reads the installed Worker in its space, with its persisted autonomy and enabled state', async () => {
    const managedWorkflows = createManagedWorkflows();

    await expect(
      readInstalledWorker({ managedWorkflows, registration: getRegistration(), spaceId: 'space-a' })
    ).resolves.toEqual({
      autonomyLevel: 'supervised',
      enabled: true,
      workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    });
    expect(managedWorkflows.getWorkflowStatus).toHaveBeenCalledWith(
      SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      { spaceId: 'space-a', workflowIdSuffix: 'space-a' }
    );
    expect(managedWorkflows.getInstalledWorkflowState).toHaveBeenCalledWith(
      `${SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID}-space-a`,
      'space-a'
    );
  });

  it('reports a disabled Worker as not enabled', async () => {
    const managedWorkflows = createManagedWorkflows({
      statusReport: status({ enabled: false, status: 'disabled' }),
    });

    await expect(
      readInstalledWorker({ managedWorkflows, registration: getRegistration(), spaceId: 'space-a' })
    ).resolves.toEqual(expect.objectContaining({ enabled: false }));
  });

  it('skips a Worker that is not installed in the space', async () => {
    const managedWorkflows = createManagedWorkflows({
      statusReport: status({ enabled: null, installed: false, status: 'missing' }),
    });

    await expect(
      readInstalledWorker({ managedWorkflows, registration: getRegistration(), spaceId: 'space-a' })
    ).resolves.toBeUndefined();
    expect(managedWorkflows.getInstalledWorkflowState).not.toHaveBeenCalled();
  });

  it('skips a document at the Worker id that AlertZero does not manage', async () => {
    const managedWorkflows = createManagedWorkflows({
      statusReport: status({ status: 'not_managed' }),
    });

    await expect(
      readInstalledWorker({ managedWorkflows, registration: getRegistration(), spaceId: 'space-a' })
    ).resolves.toBeUndefined();
  });

  it('skips a Worker whose stored settings are missing', async () => {
    const managedWorkflows = createManagedWorkflows({ templateValues: null });

    await expect(
      readInstalledWorker({ managedWorkflows, registration: getRegistration(), spaceId: 'space-a' })
    ).resolves.toBeUndefined();
  });

  it('skips a Worker whose stored settings do not parse', async () => {
    const managedWorkflows = createManagedWorkflows({
      templateValues: { ...supervisedValues(), settingsVersion: 999 },
    });

    await expect(
      readInstalledWorker({ managedWorkflows, registration: getRegistration(), spaceId: 'space-a' })
    ).resolves.toBeUndefined();
  });

  it('propagates a read failure so the caller can leave the space out', async () => {
    const managedWorkflows = createManagedWorkflows();
    managedWorkflows.getWorkflowStatus.mockRejectedValue(new Error('es down'));

    await expect(
      readInstalledWorker({ managedWorkflows, registration: getRegistration(), spaceId: 'space-a' })
    ).rejects.toThrow('es down');
  });
});
