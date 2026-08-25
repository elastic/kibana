/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AlertsCardItemId } from './types';
import type { CardSelectorAssetListItem } from '../types';
import { CardAssetType } from '../types';

export const ALERTS_CARD_ITEMS: CardSelectorAssetListItem[] = [
  {
    id: AlertsCardItemId.list,
    title: i18n.translate('xpack.securitySolution.onboarding.alertsCards.details.title', {
      defaultMessage: 'Alert list and details',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.alertsCards.details.description',
      {
        defaultMessage: 'Sort through alerts and drill down into its details',
      }
    ),
    asset: {
      type: CardAssetType.video,
      source: '//play.vidyard.com/evxFZ8dqfjH6SGPtRriyE6',
      alt: i18n.translate('xpack.securitySolution.onboarding.alertsCards.details.description', {
        defaultMessage: 'Sort through alerts and drill down into its details',
      }),
    },
  },
  {
    id: AlertsCardItemId.timeline,
    title: i18n.translate('xpack.securitySolution.onboarding.alertsCards.timeline.title', {
      defaultMessage: 'Investigate in Timeline',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.alertsCards.timeline.description',
      {
        defaultMessage: 'Streamline alert investigation with real-time visualization',
      }
    ),
    asset: {
      type: CardAssetType.video,
      source: '//play.vidyard.com/nXC8MSkzDBWajoXWJ3QeQp',
      alt: i18n.translate('xpack.securitySolution.onboarding.alertsCards.timeline.description', {
        defaultMessage: 'Streamline alert investigation with real-time visualization',
      }),
    },
  },
  {
    id: AlertsCardItemId.analyzer,
    title: i18n.translate('xpack.securitySolution.onboarding.alertsCards.analyzer.title', {
      defaultMessage: 'Investigate in Analyzer',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.alertsCards.analyzer.description',
      {
        defaultMessage: 'Simplify alert analysis by visualizing threat detection processes',
      }
    ),
    asset: {
      type: CardAssetType.video,
      source: '//play.vidyard.com/VSvxJeSQzrFN9K6hdeLz58',
      alt: i18n.translate('xpack.securitySolution.onboarding.alertsCards.analyzer.description', {
        defaultMessage: 'Simplify alert analysis by visualizing threat detection processes',
      }),
    },
  },
  {
    id: AlertsCardItemId.sessionView,
    title: i18n.translate('xpack.securitySolution.onboarding.alertsCards.sessionView.title', {
      defaultMessage: 'Investigate in Session View',
    }),
    description: i18n.translate(
      'xpack.securitySolution.onboarding.alertsCards.sessionView.description',
      {
        defaultMessage: 'Centralized threat analysis and response with real-time data insights',
      }
    ),
    asset: {
      type: CardAssetType.video,
      source: '//play.vidyard.com/3TNBvcisQWFKTcmbyprmrU',
      alt: i18n.translate('xpack.securitySolution.onboarding.alertsCards.sessionView.description', {
        defaultMessage: 'Centralized threat analysis and response with real-time data insights',
      }),
    },
  },
];

export const ALERTS_CARD_ITEMS_BY_ID = Object.fromEntries(
  ALERTS_CARD_ITEMS.map((card) => [card.id, card])
);
