/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import type { EntityInventoryPagePath } from './routes/config';

export const ENTITY_INVENTORY_TITLE = i18n.translate('xpack.entityInventoryApp.appTitle', {
  defaultMessage: 'Entity Inventory',
});

export interface EntityInventoryPage {
  /** Deep link ID of the page, checked against the navigation `link` type where it is used. */
  deepLinkId: string;
  /** Also reported as the click detail of the no data button: changing a value changes the telemetry data. */
  entityCategory: string;
  path: EntityInventoryPagePath;
  title: string;
  /** Onboarding locator params for the "Add data" button of the no data state. */
  onboarding: ObservabilityOnboardingLocatorParams;
}

/**
 * Each page here requires a matching ID in EntityInventoryAppLinkId:
 * src/platform/packages/shared/deeplinks/observability/deep_links.ts
 *
 * Adding a page = one entry below + one ID in EntityInventoryAppLinkId.
 */
export const ENTITY_INVENTORY_PAGES = [
  {
    deepLinkId: 'allResources',
    entityCategory: 'all',
    path: '/all-resources',
    title: i18n.translate('xpack.entityInventoryApp.pages.allResourcesTitle', {
      defaultMessage: 'All resources',
    }),
    onboarding: {},
  },
  {
    deepLinkId: 'hosts',
    entityCategory: 'hosts',
    path: '/hosts',
    title: i18n.translate('xpack.entityInventoryApp.pages.hostsTitle', {
      defaultMessage: 'Hosts',
    }),
    onboarding: {},
  },
  {
    deepLinkId: 'kubernetes',
    entityCategory: 'kubernetes',
    path: '/kubernetes',
    title: i18n.translate('xpack.entityInventoryApp.pages.kubernetesTitle', {
      defaultMessage: 'Kubernetes',
    }),
    onboarding: { source: 'kubernetes' },
  },
] as const satisfies readonly EntityInventoryPage[];
