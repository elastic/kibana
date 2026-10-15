/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { createTelemetrySnapshotDependencies } from './create_telemetry_snapshot_dependencies';

const setup = ({
  serviceAccountsEnabled = true,
  withSpaces = true,
}: { serviceAccountsEnabled?: boolean; withSpaces?: boolean } = {}) => {
  const core = coreMock.createStart();
  jest.spyOn(core.security.serviceAccounts, 'isEnabled').mockReturnValue(serviceAccountsEnabled);
  const unsafeClient = savedObjectsClientMock.create();
  const scopedClient = savedObjectsClientMock.create();
  unsafeClient.asScopedToNamespace.mockReturnValue(scopedClient);
  core.savedObjects.getUnsafeInternalClient.mockReturnValue(unsafeClient);
  const managedWorkflows = { getInstalledWorkflowState: jest.fn(), getWorkflowStatus: jest.fn() };
  const isOptedIn$ = new BehaviorSubject(true);
  const getAttackDiscoveryWorkflowsEnabled = jest.fn(async () => false);
  const dependencies = createTelemetrySnapshotDependencies({
    core,
    getAttackDiscoveryWorkflowsEnabled,
    getManagedWorkflows: async () => managedWorkflows,
    spaces: withSpaces ? ({} as never) : undefined,
    telemetry: { isOptedIn$ } as never,
  });
  return {
    core,
    dependencies,
    getAttackDiscoveryWorkflowsEnabled,
    isOptedIn$,
    managedWorkflows,
    scopedClient,
    unsafeClient,
  };
};

describe('createTelemetrySnapshotDependencies', () => {
  it('reads Advanced Settings through the internal client scoped to the space', async () => {
    const { core, dependencies, scopedClient, unsafeClient } = setup();
    const config = { attributes: {}, id: '9.6.0', references: [], type: 'config' };
    scopedClient.get.mockResolvedValue(config);

    dependencies.getUiSettingsClient('space-a');
    const [[settingsSavedObjectsClient]] = core.uiSettings.asScopedToClient.mock.calls;

    expect(unsafeClient.asScopedToNamespace).toHaveBeenCalledWith('space-a');
    await expect(settingsSavedObjectsClient.get('config', '9.6.0')).resolves.toBe(config);
    expect(scopedClient.get).toHaveBeenCalledWith('config', '9.6.0');
    expect(core.savedObjects.createInternalRepository).not.toHaveBeenCalled();
  });

  it('never lets the Advanced Settings read create a missing `config` object', () => {
    const { core, dependencies, scopedClient } = setup();

    dependencies.getUiSettingsClient('space-a');
    const [[settingsSavedObjectsClient]] = core.uiSettings.asScopedToClient.mock.calls;

    expect(() => settingsSavedObjectsClient.create('config', {}, { id: '9.6.0' })).toThrow(
      'reads saved objects only'
    );
    expect(scopedClient.create).not.toHaveBeenCalled();
  });

  it('enumerates spaces through the space saved objects when the spaces plugin is enabled', async () => {
    const { core, dependencies } = setup();
    const find = jest.fn().mockResolvedValue({ saved_objects: [{ id: 'space-a' }] });
    core.savedObjects.createInternalRepository.mockReturnValue({ find } as never);

    await expect(dependencies.listSpaceIds(new AbortController().signal)).resolves.toEqual([
      'default',
      'space-a',
    ]);
    expect(core.savedObjects.createInternalRepository).toHaveBeenCalledWith(['space']);
  });

  it('has only the default space without the spaces plugin', async () => {
    const { core, dependencies } = setup({ withSpaces: false });

    await expect(dependencies.listSpaceIds(new AbortController().signal)).resolves.toEqual([
      'default',
    ]);
    expect(core.savedObjects.createInternalRepository).not.toHaveBeenCalled();
  });

  it('reads the Attack Discovery Workflows flag through the reader the plugin follows it with', async () => {
    const { core, dependencies, getAttackDiscoveryWorkflowsEnabled } = setup();

    await expect(dependencies.getAttackDiscoveryWorkflowsEnabled()).resolves.toBe(false);
    expect(getAttackDiscoveryWorkflowsEnabled).toHaveBeenCalledTimes(1);
    expect(core.featureFlags.getBooleanValue$).not.toHaveBeenCalled();
  });

  it('passes the telemetry opt-in stream, core analytics and the managed workflows client', async () => {
    const { core, dependencies, isOptedIn$, managedWorkflows } = setup();

    expect(dependencies.isOptedIn$).toBe(isOptedIn$);
    expect(dependencies.analytics).toBe(core.analytics);
    await expect(dependencies.getManagedWorkflows()).resolves.toBe(managedWorkflows);
  });

  it.each([[true], [false]])(
    'reads whether Kibana service accounts are on (%s)',
    (serviceAccountsEnabled) => {
      const { dependencies } = setup({ serviceAccountsEnabled });

      expect(dependencies.serviceAccountsEnabled).toBe(serviceAccountsEnabled);
    }
  );

  it('has no opt-in stream without the telemetry plugin', () => {
    const core = coreMock.createStart();

    const dependencies = createTelemetrySnapshotDependencies({
      core,
      getAttackDiscoveryWorkflowsEnabled: async () => true,
      getManagedWorkflows: async () => undefined,
      spaces: undefined,
      telemetry: undefined,
    });

    expect(dependencies.isOptedIn$).toBeUndefined();
  });
});
