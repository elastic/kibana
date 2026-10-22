/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  AppDeepLink,
  AppDeepLinkLocations,
  CoreSetup,
  CoreStart,
  Plugin,
} from '@kbn/core/public';
import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import type { NavigationEntry } from '@kbn/observability-shared-plugin/public';
import { INFRA_ENTITIES_INVENTORY_EXPERIENCE_KEY } from '../common/ui_settings_keys';
import type {
  EntityInventoryAppPublicSetup,
  EntityInventoryAppPublicStart,
  EntityInventoryAppSetupDependencies,
  EntityInventoryAppStartDependencies,
} from './types';

const AppComponent = React.lazy(() =>
  import('./application').then((m) => ({ default: m.EntityInventoryApp }))
);

/**
 * Each entity type entry here requires a matching ID in MetricsLinkId:
 * src/platform/packages/shared/deeplinks/observability/deep_links.ts
 *
 * Pattern: path = /inventory/<entityType>, deepLinkId = inventory-<entityType>
 * Adding a new entity type = one entry below + one ID in MetricsLinkId.
 */
const NAV_ITEMS = [
  {
    label: () =>
      i18n.translate('xpack.entityInventoryApp.nav.allResourcesLabel', {
        defaultMessage: 'All resources',
      }),
    app: 'metrics' as const,
    path: '/inventory/all-resources',
    deepLinkId: 'inventory-all-resources',
  },
  {
    label: () =>
      i18n.translate('xpack.entityInventoryApp.nav.hostsLabel', {
        defaultMessage: 'Hosts',
      }),
    app: 'metrics' as const,
    path: '/inventory/hosts',
    deepLinkId: 'inventory-hosts',
  },
  {
    label: () =>
      i18n.translate('xpack.entityInventoryApp.nav.kubernetesLabel', {
        defaultMessage: 'Kubernetes',
      }),
    app: 'metrics' as const,
    path: '/inventory/kubernetes',
    deepLinkId: 'inventory-kubernetes',
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

    const showEntityInventory = core.uiSettings.get<boolean>(
      INFRA_ENTITIES_INVENTORY_EXPERIENCE_KEY,
      false
    );

    const visibleIn: AppDeepLinkLocations[] = ['globalSearch', 'projectSideNav'];
    const deepLinks: AppDeepLink[] = NAV_ITEMS.map(({ deepLinkId, label, path }) => ({
      id: deepLinkId,
      title: label(),
      path,
      visibleIn,
    }));

    const navEntries: NavigationEntry[] = NAV_ITEMS.map(({ label, app, path }) => ({
      label: label(),
      app,
      path,
    }));

    return { showEntityInventory, deepLinks, navEntries };
  }

  start(
    core: CoreStart,
    _plugins: EntityInventoryAppStartDependencies
  ): EntityInventoryAppPublicStart {
    const showEntityInventory = core.uiSettings.get<boolean>(
      INFRA_ENTITIES_INVENTORY_EXPERIENCE_KEY,
      false
    );

    const navTreeChildren: NodeDefinition[] = NAV_ITEMS.map(({ deepLinkId, label, path }) => ({
      link: `metrics:${deepLinkId}`,
      title: label(),
      getIsActive: ({
        pathNameSerialized,
        prepend,
      }: {
        pathNameSerialized: string;
        prepend: (p: string) => string;
      }) => pathNameSerialized.startsWith(prepend(`/app/metrics${path}`)),
    }));

    return { getAppComponent: () => AppComponent, showEntityInventory, navTreeChildren };
  }
}
