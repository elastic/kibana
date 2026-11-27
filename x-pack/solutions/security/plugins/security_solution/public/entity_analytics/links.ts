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
  ENTITY_ANALYTICS_HOME_PAGE_PATH,
} from '../../common/constants';
import type { LinkItem } from '../common/links/types';
import { ENTITY_ANALYTICS } from '../app/translations';
import { ENTITY_ANALYTICS_AI_AGENTS_PATH } from './components/ai_agents/constants';

export const entityAnalyticsLinks: LinkItem = {
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

/** The AI agents page. Proof of concept, behind `entityAnalyticsAiAgentsPoc`. */
export const entityAnalyticsAiAgentsLinks: LinkItem = {
  id: SecurityPageName.entityAnalyticsAiAgents,
  title: i18n.translate('xpack.securitySolution.appLinks.entityAnalyticsAiAgents', {
    defaultMessage: 'AI security',
  }),
  path: ENTITY_ANALYTICS_AI_AGENTS_PATH,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.entityAnalyticsAiAgents.agents', {
      defaultMessage: 'AI agents',
    }),
  ],
  experimentalKey: 'entityAnalyticsAiAgentsPoc',
  hideTimeline: false,
  skipUrlState: false,
  capabilities: [`${SECURITY_FEATURE_ID}.entity-analytics`],
  licenseType: 'platinum',
};
