/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, AppMountParameters } from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

export class SequentWorkflowsPlugin implements Plugin {
  public setup(core: CoreSetup): void {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      appRoute: '/app/sequent-workflows',
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });
  }

  public start(_core: CoreStart): void {}

  public stop(): void {}
}
