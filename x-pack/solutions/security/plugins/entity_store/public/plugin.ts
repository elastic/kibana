/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

export class EntityStorePlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });
  }

  public start(core: CoreStart) {}

  public stop() {}
}
