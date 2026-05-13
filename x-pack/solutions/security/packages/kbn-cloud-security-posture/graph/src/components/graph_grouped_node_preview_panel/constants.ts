/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nNamespaceKey = 'securitySolutionPackages.csp.graph.flyout.groupPreviewPanel';

export const GROUP_PREVIEW_BANNER = {
  title: i18n.translate(`${i18nNamespaceKey}.bannerTitle`, {
    defaultMessage: 'Grouped entities panel',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

export const GraphGroupedNodePreviewPanelKey = 'graphGroupedNodePreviewPanel' as const;

/**
 * Panel keys for preview panels used by the graph grouped node preview panel.
 * These must match the keys registered in the security solution flyout.
 */

// TODO: START - COPIED FROM SECURITY_SOLUTION_FLYOUT, should not be copied here. Will be removed in the future.
export const DocumentDetailsPreviewPanelKey = 'document-details-preview' as const;

export const HostPanelKey = 'host-panel' as const;
export const UserPanelKey = 'user-panel' as const;
export const ServicePanelKey = 'service-panel' as const;
export const GenericEntityPanelKey = 'generic-entity-panel' as const;

export const EntityPanelKeyByType: Record<string, string | undefined> = {
  host: HostPanelKey,
  user: UserPanelKey,
  service: ServicePanelKey,
  generic: undefined, // TODO create generic flyout?
};

// TODO: END - COPIED FROM SECURITY_SOLUTION_FLYOUT, should not be copied here. Will be removed in the future.

/**
 * Banner configurations for preview panels.
 */
export const GENERIC_ENTITY_PREVIEW_BANNER = {
  title: i18n.translate(`${i18nNamespaceKey}.entityPreviewBannerTitle`, {
    defaultMessage: 'Preview entity details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

export const ALERT_PREVIEW_BANNER = {
  title: i18n.translate(`${i18nNamespaceKey}.alertPreviewBannerTitle`, {
    defaultMessage: 'Preview alert details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

export const EVENT_PREVIEW_BANNER = {
  title: i18n.translate(`${i18nNamespaceKey}.eventPreviewBannerTitle`, {
    defaultMessage: 'Preview event details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};
