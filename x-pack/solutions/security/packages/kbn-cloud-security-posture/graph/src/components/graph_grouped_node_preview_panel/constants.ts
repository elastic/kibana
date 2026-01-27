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
