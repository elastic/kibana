/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container } from 'inversify';
import { of } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { OnSetup, OnStart, PluginStart } from '@kbn/core-di';
import { CoreSetup, CoreStart } from '@kbn/core-di-server';
import { NIGHTSHIFT_DETECTION_TIERED_FEATURES } from '../../common/constants';
import { module } from '..';
import { AvailabilityService } from '../lib/availability/availability_service';
import { DetectionEngineSystemClient } from '../lib/engine/es_client_tokens';
import { StrategyCatalog } from '../lib/strategies/strategy_catalog';

function createContainer() {
  const core = coreMock.createStart();
  core.featureFlags.getBooleanValue$.mockReturnValue(of(true));
  const coreSetup = coreMock.createSetup();

  // No cloud plugin is bound: the availability service must still resolve (classic deployment).
  const container = new Container({ defaultScope: 'Singleton' });
  container.bind(CoreSetup('pricing')).toConstantValue(coreSetup.pricing);
  container.bind(CoreStart('elasticsearch')).toConstantValue(core.elasticsearch);
  container.bind(CoreStart('featureFlags')).toConstantValue(core.featureFlags);
  container.bind(CoreStart('pricing')).toConstantValue(core.pricing);
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
    container.getAll(OnStart);
    container.getAll(OnSetup).forEach((onSetup) => onSetup(container));

    expect(coreSetup.pricing.registerProductFeatures).toHaveBeenCalledWith(
      NIGHTSHIFT_DETECTION_TIERED_FEATURES
    );
    // Engine indices are written as kibana_system, never as the requesting user.
    expect(container.get(DetectionEngineSystemClient)).toBe(
      core.elasticsearch.client.asInternalUser
    );
  });
});
