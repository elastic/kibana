/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type {
  EntityInventoryAppPublicSetup,
  EntityInventoryAppPublicStart,
  EntityInventoryAppSetupDependencies,
  EntityInventoryAppStartDependencies,
} from './types';

export class EntityInventoryAppPlugin
  implements
    Plugin<
      EntityInventoryAppPublicSetup,
      EntityInventoryAppPublicStart,
      EntityInventoryAppSetupDependencies,
      EntityInventoryAppStartDependencies
    >
{
  setup(
    core: CoreSetup<EntityInventoryAppStartDependencies, EntityInventoryAppPublicStart>,
    _plugins: EntityInventoryAppSetupDependencies
  ): EntityInventoryAppPublicSetup {
    core.application.register({
      id: 'entityInventoryApp',
      title: i18n.translate('xpack.entityInventoryApp.appTitle', {
        defaultMessage: 'Entity Inventory',
      }),
      visibleIn: [],
      mount: async ({ element }) => {
        const { renderApp } = await import('./application');
        return renderApp(element, core.getStartServices);
      },
    });

    return {};
  }

  start(
    core: CoreStart,
    plugins: EntityInventoryAppStartDependencies
  ): EntityInventoryAppPublicStart {
    // Created once so the host app does not remount it on every render.
    const AppComponent = React.lazy(() =>
      import('./application').then(({ createBoundEntityInventoryApp }) => ({
        default: createBoundEntityInventoryApp({ core, plugins }),
      }))
    );

    return { getAppComponent: () => AppComponent };
  }
}
