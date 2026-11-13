/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container } from 'inversify';
import { of } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { OnStart, PluginSetup, PluginStart } from '@kbn/core-di';
import { CoreStart } from '@kbn/core-di-server';
import { module } from '..';
import { AvailabilityService } from '../lib/availability/availability_service';
import { DetectionEngineSystemClient } from '../lib/engine/es_client_tokens';

function createContainer({ withCloud }: { withCloud: boolean }) {
  const core = coreMock.createStart();
  core.featureFlags.getBooleanValue$.mockReturnValue(of(true));

  const container = new Container({ defaultScope: 'Singleton' });
  container.bind(CoreStart('elasticsearch')).toConstantValue(core.elasticsearch);
  container.bind(CoreStart('featureFlags')).toConstantValue(core.featureFlags);
  container.bind(CoreStart('pricing')).toConstantValue(core.pricing);
  container.bind(PluginStart('licensing')).toConstantValue(licensingMock.createStart());
  if (withCloud) {
    container.bind(PluginSetup('cloud')).toConstantValue(cloudMock.createSetup());
  }
  container.load(module);

  return { container, core };
}

describe('module', () => {
  // A new binding in the module goes in this list, so a missing dependency fails here and not
  // at Kibana start.
  it('resolves every token the module binds', () => {
    const { container, core } = createContainer({ withCloud: true });

    container.get(AvailabilityService);
    // The module itself binds an OnStart hook next to the plugin's, so ask for all of them.
    container.getAll(OnStart);
    // D11: engine indices are written as kibana_system, never as the requesting user.
    expect(container.get(DetectionEngineSystemClient)).toBe(
      core.elasticsearch.client.asInternalUser
    );
  });

  it('resolves the availability service when the cloud plugin is disabled', () => {
    const { container } = createContainer({ withCloud: false });

    container.get(AvailabilityService);
  });
});
