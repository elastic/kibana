/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container } from 'inversify';
import { of } from 'rxjs';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { Logger, OnSetup, OnStart, PluginSetup, PluginStart } from '@kbn/core-di';
import { CoreSetup, CoreStart, PluginInitializer, Request } from '@kbn/core-di-server';
import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { DetectionSignal } from '../../common/detection_signal';
import { NIGHTSHIFT_DETECTION_TIERED_FEATURES } from '../../common/constants';
import { module } from '..';
import { AvailabilityService } from '../lib/availability/availability_service';
import { DetectionEngineSystemClient } from '../lib/engine/es_client_tokens';
import { SpaceRunLock } from '../lib/engine/space_run_lock';
import { TickService } from '../lib/engine/tick_service';
import { DetectionAccountService } from '../lib/service_account/detection_account';
import { DetectionSetupService } from '../lib/service_account/setup_service';
import { DetectionWorkflowInstaller } from '../lib/workflows/detection_workflow_installer';
import { DetectionSignalStore } from '../lib/signals/signal_store';
import { DetectionStateClient, detectionStateSavedObjectType } from '../lib/state';
import { StrategyCatalog } from '../lib/strategies/strategy_catalog';
import { InMemorySavedObjectsRepository } from '../test_utils/in_memory_saved_objects_repository';
import { DETECTION_ENGINE_WORKLOAD_TYPE } from '../lib/service_account/workload';

function createContainer() {
  const core = coreMock.createStart();
  core.featureFlags.getBooleanValue$.mockReturnValue(of(true));
  const coreSetup = coreMock.createSetup();

  // No cloud plugin is bound: the availability service must still resolve (classic deployment).
  const container = new Container({ defaultScope: 'Singleton' });
  container.bind(CoreSetup('pricing')).toConstantValue(coreSetup.pricing);
  container.bind(CoreSetup('savedObjects')).toConstantValue(coreSetup.savedObjects);
  container.bind(CoreStart('savedObjects')).toConstantValue(core.savedObjects);
  container.bind(CoreStart('elasticsearch')).toConstantValue(core.elasticsearch);
  container.bind(CoreStart('featureFlags')).toConstantValue(core.featureFlags);
  container.bind(Logger).toConstantValue(loggingSystemMock.createLogger());
  container.bind(CoreStart('pricing')).toConstantValue(core.pricing);
  container.bind(CoreStart('security')).toConstantValue(core.security);
  container.bind(CoreSetup('security')).toConstantValue(coreSetup.security);
  container
    .bind(PluginInitializer('env'))
    .toConstantValue(coreMock.createPluginInitializerContext().env);
  container.bind(Request).toConstantValue(httpServerMock.createKibanaRequest());
  const createSignalEvent = jest.fn().mockResolvedValue({ group_hash: 'hash' });
  const alerting = {
    getAlertEventsClientWithRequest: jest.fn().mockResolvedValue({ createSignalEvent }),
  } as unknown as AlertingServerStart;
  const spaces = {
    spacesService: { getSpaceId: jest.fn().mockReturnValue('default') },
  } as unknown as SpacesPluginStart;
  container.bind(PluginStart('alertingVTwo')).toConstantValue(alerting);
  container.bind(PluginStart('spaces')).toConstantValue(spaces);
  container.bind(PluginStart('licensing')).toConstantValue(licensingMock.createStart());
  // What the plugin reads from other plugins and from Core's DI.
  core.injection.fork.mockImplementation(() => new Container({ parent: container }));
  container.bind(CoreStart('injection')).toConstantValue(core.injection);
  container.bind(PluginStart('nightshiftSources')).toConstantValue({
    getSourcesClient: async () => ({ list: async () => ({ sources: [], total: 0 }) }),
  });
  container.bind(PluginStart('workflowsExtensions')).toConstantValue({});
  container.bind(PluginSetup('workflowsExtensions')).toConstantValue({
    registerManagedWorkflowOwner: jest.fn(),
  });
  container.bind(PluginSetup('workflowsManagement')).toConstantValue({});
  container.load(module);

  return { container, core, coreSetup, alerting };
}

const SIGNAL = {
  space_id: 'default',
  group_hash: 'hash',
  source: 'elastic.nightshift_detection_engine',
  status: 'breached',
  scheduled_timestamp: '2026-11-13T10:00:00.000Z',
  data: { strategy: 'error_rate', fingerprint: 'checkout' },
} as unknown as DetectionSignal;

describe('module', () => {
  // A new binding in the module goes in this test, so a missing dependency fails here and not
  // at Kibana start.
  it('resolves every token the module binds and registers the pricing feature', () => {
    const { container, core, coreSetup } = createContainer();

    container.get(AvailabilityService);
    container.get(StrategyCatalog);
    container.get(DetectionSignalStore);
    container.get(DetectionStateClient);
    container.get(DetectionAccountService);
    container.get(DetectionSetupService);
    container.get(DetectionWorkflowInstaller);
    container.get(TickService);
    container.get(SpaceRunLock);
    container.getAll(OnStart);
    container.getAll(OnSetup).forEach((onSetup) => onSetup(container));

    expect(coreSetup.pricing.registerProductFeatures).toHaveBeenCalledWith(
      NIGHTSHIFT_DETECTION_TIERED_FEATURES
    );
    expect(coreSetup.savedObjects.registerType).toHaveBeenCalledWith(detectionStateSavedObjectType);
    // Without the registration, every `bindWorkload` of the engine is refused at runtime.
    expect(coreSetup.security.serviceAccounts.registerWorkloadType).toHaveBeenCalledWith(
      expect.objectContaining({ type: DETECTION_ENGINE_WORKLOAD_TYPE })
    );
    // Engine indices are written as kibana_system, never as the requesting user.
    expect(container.get(DetectionEngineSystemClient)).toBe(
      core.elasticsearch.client.asInternalUser
    );
  });

  // The runner is bound in a scope forked per tick, which no route test reaches, so this is where a
  // missing token between the runner and the module shows up.
  it('runs a tick through a forked scope', async () => {
    const { container } = createContainer();
    jest
      .spyOn(container.get(AvailabilityService), 'getUnavailableReason')
      .mockResolvedValue(undefined);
    await container.unbind(DetectionStateClient);
    container
      .bind(DetectionStateClient)
      .toConstantValue(
        new DetectionStateClient(new InMemorySavedObjectsRepository().asRepository())
      );
    // The real lock writes to Elasticsearch; this test is about the scope, not the lock.
    await container.unbind(SpaceRunLock);
    const lock: Pick<SpaceRunLock, 'run'> = {
      run: async ({ callback }) => ({ ran: true, result: await callback() }),
    };
    container.bind(SpaceRunLock).toConstantValue(lock as unknown as SpaceRunLock);

    const result = await container.get(TickService).run({
      accountRequest: httpServerMock.createKibanaRequest(),
      spaceId: 'default',
      skipBacklog: false,
      abortSignal: new AbortController().signal,
    });

    expect(result).toMatchObject({ status: 'completed', strategies: [] });
  });

  it('gives every tick scope the signal store of its own request', async () => {
    const { container, alerting } = createContainer();
    const requests = [httpServerMock.createKibanaRequest(), httpServerMock.createKibanaRequest()];

    // A tick forks the container and binds its request, as the tick service does.
    for (const request of requests) {
      const tick = new Container({ parent: container, defaultScope: 'Singleton' });
      tick.bind(Request).toConstantValue(request);
      await tick.get(DetectionSignalStore).write([SIGNAL]);
    }

    const { calls } = jest.mocked(alerting.getAlertEventsClientWithRequest).mock;
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toBe(requests[0]);
    expect(calls[1][0]).toBe(requests[1]);
  });
});
