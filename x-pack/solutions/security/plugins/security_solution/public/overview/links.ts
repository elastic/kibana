/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SECURITY_UI_SHOW_PRIVILEGE } from '@kbn/security-solution-features/constants';
import {
  DATA_QUALITY_PATH,
  DETECTION_RESPONSE_PATH,
  OVERVIEW_PATH,
  SecurityPageName,
} from '../../common/constants';
import { DATA_QUALITY, DETECTION_RESPONSE, OVERVIEW } from '../app/translations';
import type { LinkItem } from '../common/links/types';
import overviewPageImg from '../common/images/overview_page.png';
import dataQualityDashboardPageImg from '../common/images/data_quality_dashboard_page.png';
import detectionResponsePageImg from '../common/images/detection_response_page.png';

export const overviewLinks: LinkItem = {
  id: SecurityPageName.overview,
  title: OVERVIEW,
  landingImage: overviewPageImg,
  description: i18n.translate('xpack.securitySolution.appLinks.overviewDescription', {
    defaultMessage:
      'Summary of your security environment activity, including alerts, events, recent items, and a news feed!',
  }),

  path: OVERVIEW_PATH,
  capabilities: [SECURITY_UI_SHOW_PRIVILEGE],
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
  capabilities: [SECURITY_UI_SHOW_PRIVILEGE],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.detectionAndResponse', {
      defaultMessage: 'Detection & Response',
    }),
  ],
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
  capabilities: [SECURITY_UI_SHOW_PRIVILEGE],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.ecsDataQualityDashboard', {
      defaultMessage: 'Data Quality',
    }),
  ],
};
