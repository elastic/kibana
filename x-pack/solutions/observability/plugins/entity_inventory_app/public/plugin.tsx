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

/**
 * Each entity type entry here requires a matching ID in EntityInventoryAppLinkId:
 * src/platform/packages/shared/deeplinks/observability/deep_links.ts
 *
 * Pattern: path = /<entityType>, deepLinkId = <entityType>
 * Adding a new entity type = one entry below + one ID in EntityInventoryAppLinkId.
 */
const NAV_ITEMS = [
  {
    label: () =>
      i18n.translate('xpack.entityInventoryApp.nav.hostsLabel', {
        defaultMessage: 'Hosts',
      }),
    app: 'entityInventoryApp' as const,
    path: '/hosts',
    deepLinkId: 'hosts',
  },
  {
    label: () =>
      i18n.translate('xpack.entityInventoryApp.nav.kubernetesLabel', {
        defaultMessage: 'Kubernetes',
      }),
    app: 'entityInventoryApp' as const,
    path: '/kubernetes',
    deepLinkId: 'kubernetes',
  },
] as const;

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
      deepLinks: [
        {
          id: 'allResources',
          title: i18n.translate('xpack.entityInventoryApp.nav.allResourcesLabel', {
            defaultMessage: 'All resources',
          }),
          path: '/all-resources',
          visibleIn,
        },
        ...NAV_ITEMS.map(({ deepLinkId, label, path }) => ({
          id: deepLinkId,
          title: label(),
          path,
          visibleIn,
        })),
      ],
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
          entries: [
            {
              label: i18n.translate('xpack.entityInventoryApp.nav.allResourcesLabel', {
                defaultMessage: 'All resources',
              }),
              app: 'entityInventoryApp',
              path: '/all-resources',
            },
            ...NAV_ITEMS.map(({ label, app, path }) => ({
              label: label(),
              app,
              path,
            })),
          ],
        },
      ])
    );

    const navTreeChildren: NodeDefinition[] = [
      {
        link: 'entityInventoryApp:allResources',
        title: i18n.translate('xpack.entityInventoryApp.nav.allResourcesLabel', {
          defaultMessage: 'All resources',
        }),
        getIsActive: ({
          pathNameSerialized,
          prepend,
        }: {
          pathNameSerialized: string;
          prepend: (p: string) => string;
        }) => pathNameSerialized.startsWith(prepend('/app/entity-inventory/all-resources')),
      },
      ...NAV_ITEMS.map(({ deepLinkId, label, path }) => ({
        link: `entityInventoryApp:${deepLinkId}` as const,
        title: label(),
        getIsActive: ({
          pathNameSerialized,
          prepend,
        }: {
          pathNameSerialized: string;
          prepend: (p: string) => string;
        }) => pathNameSerialized.startsWith(prepend(`/app/entity-inventory${path}`)),
      })),
    ];

    return { navTreeChildren };
  }
}
