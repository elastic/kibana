/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ALERT_DETECTIONS,
  ALERT_SUMMARY_PATH,
  ALERTS_PATH,
  ATTACK_DISCOVERY_FEATURE_ID,
  ATTACKS_PATH,
  SECURITY_FEATURE_ID,
  SecurityPageName,
} from '../../common/constants';
import { ALERT_SUMMARY, ALERTS, ATTACKS } from '../app/translations';
import type { LinkItem } from '../common/links/types';

export const alertsLink: LinkItem = {
  capabilities: [[`${SECURITY_FEATURE_ID}.show`, `${SECURITY_FEATURE_ID}.detections`]],
  globalNavPosition: 3,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.alerts', {
      defaultMessage: 'Alerts',
    }),
  ],
  id: SecurityPageName.alerts,
  path: ALERTS_PATH,
  title: ALERTS,
};

const alertsSubLink: LinkItem = {
  ...alertsLink,
  globalNavPosition: undefined,
  description: i18n.translate('xpack.securitySolution.appLinks.alerts.description', {
    defaultMessage:
      'Review individual detections triggered by security rules and take immediate action.',
  }),
};

const attacksSubLink: LinkItem = {
  capabilities: [
    [`${SECURITY_FEATURE_ID}.show`, `${ATTACK_DISCOVERY_FEATURE_ID}.attack-discovery`],
  ],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.attacks', {
      defaultMessage: 'Attacks',
    }),
  ],
  id: SecurityPageName.attacks,
  path: ATTACKS_PATH,
  title: ATTACKS,
  description: i18n.translate('xpack.securitySolution.appLinks.attacks.description', {
    defaultMessage:
      'View correlated alerts grouped into attack chains to understand scope, impact, and progression.',
  }),
};

export const alertDetectionsLinks: LinkItem = {
  id: SecurityPageName.alertDetections,
  title: i18n.translate('xpack.securitySolution.appLinks.alertDetections.title', {
    defaultMessage: 'Detections',
  }),
  path: ALERT_DETECTIONS,
  capabilities: [
    [`${SECURITY_FEATURE_ID}.show`, `${SECURITY_FEATURE_ID}.detections`],
    [`${SECURITY_FEATURE_ID}.show`, `${ATTACK_DISCOVERY_FEATURE_ID}.attack-discovery`],
  ],
  globalNavPosition: 3,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.alertDetections', {
      defaultMessage: 'Detections',
    }),
  ],
  links: [attacksSubLink, alertsSubLink],
  skipUrlState: true,
  categories: [
    {
      label: i18n.translate('xpack.securitySolution.appLinks.category.views', {
        defaultMessage: 'Views',
      }),
      linkIds: [SecurityPageName.attacks, SecurityPageName.alerts],
    },
  ],
};

export const alertSummaryLink: LinkItem = {
  capabilities: [[`${SECURITY_FEATURE_ID}.show`, `${SECURITY_FEATURE_ID}.external_detections`]],
  globalNavPosition: 3,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.alertSummary', {
      defaultMessage: 'Alert summary',
    }),
  ],
  hideTimeline: true,
  id: SecurityPageName.alertSummary,
  path: ALERT_SUMMARY_PATH,
  title: ALERT_SUMMARY,
};
