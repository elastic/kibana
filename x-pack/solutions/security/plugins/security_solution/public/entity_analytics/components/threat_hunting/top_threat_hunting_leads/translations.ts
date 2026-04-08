/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TOP_HUNTING_LEADS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.title',
  { defaultMessage: 'Top Hunting Leads' }
);

export const SEE_ALL_LEADS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.seeAll',
  { defaultMessage: 'See all' }
);

export const GENERATE_LEADS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.generate',
  { defaultMessage: 'Generate' }
);

export const GENERATING_LEADS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.generating',
  { defaultMessage: 'Generating...' }
);

export const GENERATING_LEADS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.generatingDescription',
  { defaultMessage: 'Analyzing entities, risk scores, and alerts to surface hunting leads...' }
);

export const HUNT_IN_CHAT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.huntInChat',
  { defaultMessage: 'Hunt in Chat' }
);

export const NO_LEADS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.emptyTitle',
  { defaultMessage: 'No hunting leads yet' }
);

export const NO_LEADS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.emptyDescription',
  {
    defaultMessage:
      'Generate leads to surface proactive threat hunting opportunities from your entity data.',
  }
);

export const NO_DATA_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.noDataTitle',
  { defaultMessage: 'No data found' }
);

export const NO_DATA_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.noDataDescription',
  {
    defaultMessage:
      'No entities, risk scores, or alerts were found to generate hunting leads. Ensure the Entity Store and Risk Engine are enabled with data available.',
  }
);

export const ALL_HUNTING_LEADS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.flyout.title',
  { defaultMessage: 'All Hunting Leads' }
);

export const LEAD_PROVENANCE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.provenance.title',
  { defaultMessage: 'Lead Details' }
);

export const DESCRIPTION_SECTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.provenance.description',
  { defaultMessage: 'Description' }
);

export const ENTITIES_SECTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.provenance.entities',
  { defaultMessage: 'Entities' }
);

export const OBSERVATIONS_SECTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.provenance.observations',
  { defaultMessage: 'Observations' }
);

export const TAGS_SECTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.provenance.tags',
  { defaultMessage: 'Tags' }
);

export const CHAT_RECOMMENDATIONS_SECTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.provenance.chatRecommendations',
  { defaultMessage: 'Chat Recommendations' }
);

export const INVESTIGATE_IN_CHAT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.provenance.investigateInChat',
  { defaultMessage: 'Investigate in Chat' }
);

export const DISMISS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.dismiss',
  { defaultMessage: 'Dismiss' }
);

export const CLOSE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.close',
  { defaultMessage: 'Close' }
);

export const GENERATE_SUCCESS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.generateSuccess',
  { defaultMessage: 'Lead generation started successfully' }
);

export const GENERATE_ERROR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.generateError',
  { defaultMessage: 'Failed to generate leads' }
);

export const STALENESS_FRESH = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.staleness.fresh',
  { defaultMessage: 'Fresh' }
);

export const STALENESS_STALE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.staleness.stale',
  { defaultMessage: 'Stale' }
);

export const STALENESS_EXPIRED = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.staleness.expired',
  { defaultMessage: 'Expired' }
);

export const FILTER_ALL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.filter.all',
  { defaultMessage: 'All' }
);

export const FILTER_ACTIVE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.filter.active',
  { defaultMessage: 'Active' }
);

export const FILTER_DISMISSED = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.filter.dismissed',
  { defaultMessage: 'Dismissed' }
);

export const LOADING = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.loading',
  { defaultMessage: 'Loading...' }
);

export const VIEW_LEAD_DETAILS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.viewLeadDetails',
  { defaultMessage: 'View lead details' }
);

export const MODULE_RISK_ANALYSIS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.module.riskAnalysis',
  { defaultMessage: 'Risk Analysis' }
);

export const MODULE_TEMPORAL_STATE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.module.temporalState',
  { defaultMessage: 'Temporal State Analysis' }
);

export const MODULE_BEHAVIORAL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.module.behavioral',
  { defaultMessage: 'Alert Analysis' }
);

export const getModuleLabel = (moduleId: string): string => {
  switch (moduleId) {
    case 'risk_analysis':
      return MODULE_RISK_ANALYSIS;
    case 'temporal_state_analysis':
      return MODULE_TEMPORAL_STATE;
    case 'behavioral_analysis':
      return MODULE_BEHAVIORAL;
    default:
      return moduleId;
  }
};

export const AUTO_REFRESH = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.autoRefresh',
  { defaultMessage: 'Auto-refresh' }
);

export const SCHEDULE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.scheduleTooltip',
  { defaultMessage: 'When enabled, leads are automatically regenerated every 24 hours' }
);

export const SCHEDULE_UPDATE_ERROR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.scheduleUpdateError',
  { defaultMessage: 'Failed to update schedule' }
);

export const getStalenessLabel = (staleness: string): string => {
  switch (staleness) {
    case 'fresh':
      return STALENESS_FRESH;
    case 'stale':
      return STALENESS_STALE;
    case 'expired':
      return STALENESS_EXPIRED;
    default:
      return staleness;
  }
};

export const SEARCH_LEADS_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.searchPlaceholder',
  { defaultMessage: 'Search leads...' }
);

export const RELATIVE_TIME_JUST_NOW = i18n.translate(
  'xpack.securitySolution.entityAnalytics.threatHunting.leads.relativeTime.justNow',
  { defaultMessage: 'Just now' }
);

export const getRelativeTimeHours = (hours: number) =>
  i18n.translate(
    'xpack.securitySolution.entityAnalytics.threatHunting.leads.relativeTime.hoursAgo',
    { defaultMessage: '{hours}h ago', values: { hours } }
  );

export const getRelativeTimeDays = (days: number) =>
  i18n.translate(
    'xpack.securitySolution.entityAnalytics.threatHunting.leads.relativeTime.daysAgo',
    { defaultMessage: '{days}d ago', values: { days } }
  );
