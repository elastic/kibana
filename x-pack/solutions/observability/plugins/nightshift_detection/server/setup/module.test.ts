/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container } from 'inversify';
import { of } from 'rxjs';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { Logger, OnSetup, OnStart, PluginStart } from '@kbn/core-di';
import { CoreSetup, CoreStart, PluginInitializer } from '@kbn/core-di-server';
import { NIGHTSHIFT_DETECTION_TIERED_FEATURES } from '../../common/constants';
import { module } from '..';
import { AvailabilityService } from '../lib/availability/availability_service';
import { DetectionEngineSystemClient } from '../lib/engine/es_client_tokens';
import { SpaceRunLock } from '../lib/engine/space_run_lock';
import { DetectionStateClient, detectionStateSavedObjectType } from '../lib/state';
import { StrategyCatalog } from '../lib/strategies/strategy_catalog';
import { DetectionAccountService } from '../lib/service_account/detection_account';
import { DetectionSetupService } from '../lib/service_account/setup_service';
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
  container.bind(CoreStart('pricing')).toConstantValue(core.pricing);
  container.bind(Logger).toConstantValue(loggingSystemMock.createLogger());
  container.bind(CoreStart('security')).toConstantValue(core.security);
  container.bind(CoreSetup('security')).toConstantValue(coreSetup.security);
  container
    .bind(PluginInitializer('env'))
    .toConstantValue(coreMock.createPluginInitializerContext().env);
  container.bind(PluginStart('spaces')).toConstantValue({});
  container.bind(PluginStart('licensing')).toConstantValue(licensingMock.createStart());
  container.load(module);

  return { container, core, coreSetup };
}

describe('module', () => {
  // A new binding in the module goes in this test, so a missing dependency fails here and not
  // at Kibana start.
  it('resolves every token the module binds and registers the pricing feature', () => {
    const { container, core, coreSetup } = createContainer();

    container.get(AvailabilityService);
    container.get(StrategyCatalog);
    container.get(DetectionStateClient);
    container.get(SpaceRunLock);
    container.get(DetectionAccountService);
    container.get(DetectionSetupService);
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
});
