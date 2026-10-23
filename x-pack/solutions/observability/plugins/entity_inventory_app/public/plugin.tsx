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

const AppComponent = React.lazy(() =>
  import('./application').then((m) => ({ default: m.EntityInventoryApp }))
);

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
        return renderApp(element);
      },
    });

    return {};
  }

  start(
    _core: CoreStart,
    _plugins: EntityInventoryAppStartDependencies
  ): EntityInventoryAppPublicStart {
    return { getAppComponent: () => AppComponent };
  }
}
