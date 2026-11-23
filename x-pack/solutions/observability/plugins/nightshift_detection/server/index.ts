/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContainerModule } from '@kbn/core-di';
import { bindEngine } from './setup/bind_engine';
import { bindOnSetup } from './setup/bind_on_setup';
import { bindOnStart } from './setup/bind_on_start';
import { bindRoutes } from './setup/bind_routes';
import { bindServiceAccount } from './setup/bind_service_account';
import { bindServices } from './setup/bind_services';
import { bindSignals } from './setup/bind_signals';
import { bindStrategies } from './setup/bind_strategies';
import { bindState } from './setup/bind_state';
import { bindTick } from './setup/bind_tick';
import { bindWorkflows } from './setup/bind_workflows';

export { config } from './config';

/** The plugin is a DI module only: Core loads it and every service is bound in `setup/`. */
const pluginModule = new KibanaContainerModule((options) => {
  bindEngine(options);
  bindServices(options);
  bindSignals(options);
  bindStrategies(options);
  bindState(options);
  bindServiceAccount(options);
  bindWorkflows(options);
  bindTick(options);
  bindRoutes(options);
  bindOnSetup(options);
  bindOnStart(options);
});

export { pluginModule as module };
