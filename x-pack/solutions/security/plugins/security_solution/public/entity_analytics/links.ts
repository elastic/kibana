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
  ENTITY_ANALYTICS_THREAT_HUNTING_PATH,
  ENTITY_ANALYTICS_WATCHLISTS_PATH,
} from '../../common/constants';
import type { LinkItem } from '../common/links/types';
import {
  ENTITY_ANALYTICS,
  ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING,
  ENTITY_ANALYTICS_WATCHLISTS,
} from '../app/translations';
import privilegedUserMonitoringPageImg from '../common/images/privileged_user_monitoring_page.png';
import eaOverviewPageImg from '../common/images/ea_overview_page.png';

const privMonLinks: LinkItem = {
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
  hideTimeline: false,
  skipUrlState: false,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  licenseType: 'platinum',
};

const watchlistsLinks: LinkItem = {
  id: SecurityPageName.entityAnalyticsWatchlists,
  title: ENTITY_ANALYTICS_WATCHLISTS,
  description: i18n.translate('xpack.securitySolution.navigation.watchlists.description', {
    defaultMessage:
      'Provides entity-level monitoring for manually tagging and tracking high-risk entities with configurable statuses and risk score adjustments.',
  }),
  path: ENTITY_ANALYTICS_WATCHLISTS_PATH,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.watchlists', {
      defaultMessage: 'Watchlists Management',
    }),
  ],
  hideTimeline: false,
  skipUrlState: false,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  licenseType: 'platinum',
  experimentalKey: 'entityAnalyticsWatchlistEnabled',
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
  // Hide overview when threat hunting is enabled
  hideWhenExperimentalKey: 'entityThreatHuntingEnabled',
};

const threatHuntingLinks: LinkItem = {
  id: SecurityPageName.entityAnalyticsThreatHunting,
  title: i18n.translate('xpack.securitySolution.appLinks.entityAnalytics.threatHunting', {
    defaultMessage: 'Entity Threat Hunting',
  }),
  description: i18n.translate(
    'xpack.securitySolution.navigation.entityAnalytics.threatHunting.description',
    {
      defaultMessage:
        'Threat hunting interface for analyzing entity risk scores, anomalies, and investigating potential security threats across users, hosts, and services.',
    }
  ),
  path: ENTITY_ANALYTICS_THREAT_HUNTING_PATH,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.entityAnalytics.threatHunting.keywords', {
      defaultMessage: 'threat hunting',
    }),
  ],
  hideTimeline: false,
  skipUrlState: false,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  licenseType: 'platinum',
  experimentalKey: 'entityThreatHuntingEnabled',
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
  links: [eaOverviewLinks, privMonLinks, threatHuntingLinks, watchlistsLinks],
  hideTimeline: true,
  skipUrlState: true,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  licenseType: 'platinum',
};
