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
export const GenericEntityPanelKey = 'entity-panel' as const;
export const DocumentDetailsPreviewPanelKey = 'document-details-preview' as const;

/**
 * Banner configurations for preview panels.
 */
export const GENERIC_ENTITY_PREVIEW_BANNER = {
  title: i18n.translate(`${i18nNamespaceKey}.entityPreviewBannerTitle`, {
    defaultMessage: 'Entity preview',
  }),
  backgroundColor: 'primary',
  textColor: 'default',
};

export const ALERT_PREVIEW_BANNER = {
  title: i18n.translate(`${i18nNamespaceKey}.alertPreviewBannerTitle`, {
    defaultMessage: 'Alert preview',
  }),
  backgroundColor: 'danger',
  textColor: 'danger',
};

export const EVENT_PREVIEW_BANNER = {
  title: i18n.translate(`${i18nNamespaceKey}.eventPreviewBannerTitle`, {
    defaultMessage: 'Event preview',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};
