/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DashboardsCardItemId } from './types';
import type { CardSelectorAssetListItem } from '../types';
import { CardAssetType } from '../types';

export const DASHBOARDS_CARD_ITEMS: CardSelectorAssetListItem[] = [
  {
    id: DashboardsCardItemId.default,
    title: i18n.translate('xpack.securitySolution.onboarding.dashboardsCard.default.title', {
      defaultMessage: 'Use Elastic’s default dashboards',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.dashboardsCard.default.description',
      {
        defaultMessage:
          'Out-of-the-box dashboards for alerts, data quality, entity analytics, and more',
      }
    ),
    asset: {
      type: CardAssetType.video,
      source: '//play.vidyard.com/SpKecbJxeYWzXVpGvgxMah',
      alt: i18n.translate('xpack.securitySolution.onboarding.dashboardsCard.default.description', {
        defaultMessage:
          'Out-of-the-box dashboards for alerts, data quality, entity analytics, and more',
      }),
    },
  },
  {
    id: DashboardsCardItemId.custom,
    title: i18n.translate('xpack.securitySolution.onboarding.dashboardsCard.custom.title', {
      defaultMessage: 'Create a dashboard',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.dashboardsCard.custom.description',
      {
        defaultMessage: 'Drag and drop your way to a custom visualization',
      }
    ),
    asset: {
      type: CardAssetType.video,
      source: '//play.vidyard.com/5UvJBpzFVoEfpDLnjzTbfn',
      alt: i18n.translate('xpack.securitySolution.onboarding.dashboardsCard.custom.description', {
        defaultMessage: 'Drag and drop your way to a custom visualization',
      }),
    },
  },
];

export const DASHBOARDS_CARD_ITEMS_BY_ID = Object.fromEntries(
  DASHBOARDS_CARD_ITEMS.map((card) => [card.id, card])
);
