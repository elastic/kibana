/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderBadge } from '@kbn/app-header';
import { SecurityAppHeader } from '../../common/components/app_header';
import { DOCS_URL } from '../constants';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.assetInventory.title', {
  defaultMessage: 'Inventory',
});

const TECHNICAL_PREVIEW_LABEL = i18n.translate(
  'xpack.securitySolution.assetInventory.technicalPreviewLabel',
  { defaultMessage: 'Technical Preview' }
);

const TECHNICAL_PREVIEW_TOOLTIP = i18n.translate(
  'xpack.securitySolution.assetInventory.technicalPreviewTooltip',
  {
    defaultMessage:
      'This functionality is experimental and not supported. It may change or be removed at any time.',
  }
);

const BADGES: AppHeaderBadge[] = [
  {
    label: TECHNICAL_PREVIEW_LABEL.toUpperCase(),
    tooltip: TECHNICAL_PREVIEW_TOOLTIP,
    color: 'hollow',
  },
];

export const AssetInventoryTitle = () => (
  <SecurityAppHeader title={PAGE_TITLE} badges={BADGES} spacing="largeBleed" docLink={DOCS_URL} />
);
