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
  ENTITY_ANALYTICS_HOME_PAGE_PATH,
} from '../../common/constants';
import type { LinkItem } from '../common/links/types';
import { ENTITY_ANALYTICS } from '../app/translations';
import eaOverviewPageImg from '../common/images/ea_overview_page.png';

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
  hideWhenExperimentalKey: 'entityAnalyticsNewHomePageEnabled',
};

const homePageLinks: LinkItem = {
  id: SecurityPageName.entityAnalyticsHomePage,
  title: i18n.translate('xpack.securitySolution.appLinks.entityAnalytics.homePage', {
    defaultMessage: 'Entity Analytics',
  }),
  description: i18n.translate(
    'xpack.securitySolution.navigation.entityAnalytics.homePage.description',
    {
      defaultMessage:
        'Entity analytics interface for analyzing entity risk scores, anomalies, and investigating potential security threats across users, hosts, and services.',
    }
  ),
  path: ENTITY_ANALYTICS_HOME_PAGE_PATH,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.entityAnalytics.homePage.keywords', {
      defaultMessage: 'entity analytics',
    }),
  ],
  hideTimeline: false,
  skipUrlState: false,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  licenseType: 'platinum',
  experimentalKey: 'entityAnalyticsNewHomePageEnabled',
};

export const entityAnalyticsLinks: LinkItem = {
  id: SecurityPageName.entityAnalyticsLanding,
  title: ENTITY_ANALYTICS,
  path: ENTITY_ANALYTICS_LANDING_PATH,
  globalNavPosition: 7,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.entityAnalytics.landing', {
      defaultMessage: 'Entity analytics',
    }),
  ],
  links: [eaOverviewLinks, homePageLinks],
  hideTimeline: true,
  skipUrlState: true,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  licenseType: 'platinum',
};

export const entityAnalyticsV2Links: LinkItem = {
  id: SecurityPageName.entityAnalyticsHomePage,
  title: ENTITY_ANALYTICS,
  path: ENTITY_ANALYTICS_HOME_PAGE_PATH,
  globalNavPosition: 7,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.entityAnalytics.landing', {
      defaultMessage: 'Entity analytics',
    }),
  ],
  hideTimeline: false,
  skipUrlState: false,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  licenseType: 'platinum',
};
