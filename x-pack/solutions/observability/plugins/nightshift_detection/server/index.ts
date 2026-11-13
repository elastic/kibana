/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContainerModule } from '@kbn/core-di';
import { bindOnStart } from './setup/bind_on_start';
import { bindServices } from './setup/bind_services';

export { config } from './config';

/** The plugin is a DI module only: Core loads it and every service is bound in `setup/`. */
const pluginModule = new KibanaContainerModule((options) => {
  bindServices(options);
  bindOnStart(options);
});

export { pluginModule as module };
