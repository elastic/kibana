/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ALERT_SUMMARY_PATH,
  ALERTS_PATH,
  SECURITY_FEATURE_ID,
  SecurityPageName,
} from '../../common/constants';
import { ALERT_SUMMARY, ALERTS } from '../app/translations';
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
