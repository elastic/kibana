/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  DATA_QUALITY_PATH,
  DETECTION_RESPONSE_PATH,
  ENTITY_ANALYTICS_PATH,
  OVERVIEW_PATH,
  SecurityPageName,
  SECURITY_FEATURE_ID,
} from '../../common/constants';
import { DATA_QUALITY, DETECTION_RESPONSE, OVERVIEW, ENTITY_ANALYTICS } from '../app/translations';
import type { LinkItem } from '../common/links/types';
import overviewPageImg from '../common/images/overview_page.png';
import dataQualityDashboardPageImg from '../common/images/data_quality_dashboard_page.png';
import detectionResponsePageImg from '../common/images/detection_response_page.png';
import entityAnalyticsDashboard from '../common/images/entity_analytics_dashboard.png';

export const overviewLinks: LinkItem = {
  id: SecurityPageName.overview,
  title: OVERVIEW,
  landingImage: overviewPageImg,
  description: i18n.translate('xpack.securitySolution.appLinks.overviewDescription', {
    defaultMessage:
      'Summary of your security environment activity, including alerts, events, recent items, and a news feed!',
  }),

  path: OVERVIEW_PATH,
  capabilities: [`${SECURITY_FEATURE_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.overview', {
      defaultMessage: 'Overview',
    }),
  ],
};

export const detectionResponseLinks: LinkItem = {
  id: SecurityPageName.detectionAndResponse,
  title: DETECTION_RESPONSE,
  landingImage: detectionResponsePageImg,
  description: i18n.translate('xpack.securitySolution.appLinks.detectionAndResponseDescription', {
    defaultMessage:
      'Information about your Alerts and Cases within the Security Solution, including Hosts and Users with Alerts.',
  }),
  path: DETECTION_RESPONSE_PATH,
  capabilities: [`${SECURITY_FEATURE_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.detectionAndResponse', {
      defaultMessage: 'Detection & Response',
    }),
  ],
};

export const entityAnalyticsLinks: LinkItem = {
  id: SecurityPageName.entityAnalytics,
  title: ENTITY_ANALYTICS,
  landingImage: entityAnalyticsDashboard,
  description: i18n.translate('xpack.securitySolution.appLinks.entityAnalyticsDescription', {
    defaultMessage:
      'Entity analytics, anomalies, and threats to narrow down the monitoring surface area.',
  }),
  path: ENTITY_ANALYTICS_PATH,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  isBeta: false,
  licenseType: 'platinum',
  globalSearchKeywords: [ENTITY_ANALYTICS],
};

export const ecsDataQualityDashboardLinks: LinkItem = {
  id: SecurityPageName.dataQuality,
  title: DATA_QUALITY,
  landingImage: dataQualityDashboardPageImg,
  description: i18n.translate(
    'xpack.securitySolution.appLinks.ecsDataQualityDashboardDescription',
    {
      defaultMessage:
        'Check index mappings and values for compatibility with the Elastic Common Schema (ECS)',
    }
  ),
  path: DATA_QUALITY_PATH,
  capabilities: [`${SECURITY_FEATURE_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.ecsDataQualityDashboard', {
      defaultMessage: 'Data Quality',
    }),
  ],
};
