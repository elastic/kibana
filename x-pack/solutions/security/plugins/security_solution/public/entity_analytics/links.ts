/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SecurityPageName,
  SECURITY_FEATURE_ID,
  ENTITY_ANALYTICS_LANDING_PATH,
  ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
  ENTITY_ANALYTICS_OVERVIEW_PATH,
  ENABLE_PRIVILEGED_USER_MONITORING_SETTING,
} from '../../common/constants';
import type { LinkItem } from '../common/links/types';
import { ENTITY_ANALYTICS, ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING } from '../app/translations';
import privilegedUserMonitoringPageImg from '../common/images/privileged_user_monitoring_page.png';
import eaOverviewPageImg from '../common/images/ea_overview_page.png';

const privMonLinks: LinkItem = {
  isBeta: true,
  betaOptions: {
    text: i18n.translate('xpack.securitySolution.navigation.privilegedUserMonitoring.betaStatus', {
      defaultMessage: 'TECHNICAL PREVIEW',
    }),
  },
  id: SecurityPageName.entityAnalyticsPrivilegedUserMonitoring,
  title: ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING,
  description: i18n.translate(
    'xpack.securitySolution.navigation.privilegedUserMonitoring.description',
    {
      defaultMessage:
        'Provides visibility into privileged user activity, helping security teams analyze account usage, track access events, and spot potential risks.',
    }
  ),
  landingImage: privilegedUserMonitoringPageImg,
  path: ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.privilegedUserMonitoring', {
      defaultMessage: 'Privileged user monitoring',
    }),
  ],
  hideWhenExperimentalKey: 'privilegedUserMonitoringDisabled',
  uiSettingRequired: ENABLE_PRIVILEGED_USER_MONITORING_SETTING,
  hideTimeline: false,
  skipUrlState: false,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  licenseType: 'platinum',
};

const eaOverviewLinks: LinkItem = {
  id: SecurityPageName.entityAnalyticsOverview,
  title: i18n.translate('xpack.securitySolution.appLinks.entityAnalytics.overview', {
    defaultMessage: 'Overview',
  }),
  description: i18n.translate(
    'xpack.securitySolution.navigation.entityAnalytics.overview.description',
    {
      defaultMessage:
        'Entity analytics, anomalies, and threats to narrow down the monitoring surface area.',
    }
  ),
  landingImage: eaOverviewPageImg,
  path: ENTITY_ANALYTICS_OVERVIEW_PATH,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.entityAnalytics.overview', {
      defaultMessage: 'Overview',
    }),
  ],
  hideTimeline: false,
  skipUrlState: false,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  licenseType: 'platinum',
};

export const entityAnalyticsLinks: LinkItem = {
  id: SecurityPageName.entityAnalyticsLanding,
  title: ENTITY_ANALYTICS,
  path: ENTITY_ANALYTICS_LANDING_PATH,
  globalNavPosition: 10,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.entityAnalytics.landing', {
      defaultMessage: 'Entity analytics',
    }),
  ],
  links: [eaOverviewLinks, privMonLinks],
  hideTimeline: true,
  skipUrlState: true,
  hideWhenExperimentalKey: 'privilegedUserMonitoringDisabled',
  uiSettingRequired: ENABLE_PRIVILEGED_USER_MONITORING_SETTING,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  licenseType: 'platinum',
};
