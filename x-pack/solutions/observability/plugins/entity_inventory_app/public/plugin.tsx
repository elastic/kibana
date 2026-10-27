/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppDeepLinkLocations,
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
} from '@kbn/core/public';
import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { of } from 'rxjs';
import type {
  EntityInventoryAppPublicSetup,
  EntityInventoryAppPublicStart,
  EntityInventoryAppSetupDependencies,
  EntityInventoryAppStartDependencies,
} from './types';
import { ENTITY_INVENTORY_PAGES } from './pages';

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
    const visibleIn: AppDeepLinkLocations[] = ['globalSearch', 'projectSideNav'];

    core.application.register({
      id: 'entityInventoryApp',
      title: i18n.translate('xpack.entityInventoryApp.appTitle', {
        defaultMessage: 'Entity Inventory',
      }),
      appRoute: '/app/entity-inventory',
      visibleIn: [],
      deepLinks: ENTITY_INVENTORY_PAGES.map(({ deepLinkId, title, path }) => ({
        id: deepLinkId,
        title,
        path,
        visibleIn,
      })),
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(coreStart, pluginsStart.observabilityShared, params);
      },
    });

    return {};
  }

  start(
    core: CoreStart,
    plugins: EntityInventoryAppStartDependencies
  ): EntityInventoryAppPublicStart {
    plugins.observabilityShared.navigation.registerSections(
      of([
        {
          label: i18n.translate('xpack.entityInventoryApp.nav.entitiesLabel', {
            defaultMessage: 'Entity Inventory',
          }),
          sortKey: 300,
          entries: ENTITY_INVENTORY_PAGES.map(({ title, path }) => ({
            label: title,
            app: 'entityInventoryApp',
            path,
          })),
        },
      ])
    );

    const navTreeChildren: NodeDefinition[] = ENTITY_INVENTORY_PAGES.map(
      ({ deepLinkId, title, path }) => ({
        link: `entityInventoryApp:${deepLinkId}` as const,
        title,
        getIsActive: ({
          pathNameSerialized,
          prepend,
        }: {
          pathNameSerialized: string;
          prepend: (p: string) => string;
        }) => pathNameSerialized.startsWith(prepend(`/app/entity-inventory${path}`)),
      })
    );

    return { navTreeChildren };
  }
}
