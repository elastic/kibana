/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Each page here requires a matching ID in EntityInventoryAppLinkId:
 * src/platform/packages/shared/deeplinks/observability/deep_links.ts
 *
 * Adding a page = one entry below + one ID in EntityInventoryAppLinkId.
 */
export const ENTITY_INVENTORY_PAGES = [
  {
    deepLinkId: 'allResources',
    path: '/all-resources',
    title: i18n.translate('xpack.entityInventoryApp.pages.allResourcesTitle', {
      defaultMessage: 'All resources',
    }),
  },
  {
    deepLinkId: 'hosts',
    path: '/hosts',
    title: i18n.translate('xpack.entityInventoryApp.pages.hostsTitle', {
      defaultMessage: 'Hosts',
    }),
  },
  {
    deepLinkId: 'kubernetes',
    path: '/kubernetes',
    title: i18n.translate('xpack.entityInventoryApp.pages.kubernetesTitle', {
      defaultMessage: 'Kubernetes',
    }),
  },
] as const;
