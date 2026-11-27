/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.pageTitle',
  { defaultMessage: 'AI security' }
);

export const PAGE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.pageDescription',
  {
    defaultMessage:
      'AI coding agents running on your hosts, and the people they act for. Select one to investigate.',
  }
);

export const POC_BADGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.pocBadge',
  {
    defaultMessage: 'Proof of concept',
  }
);

export const NAV_LINK_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.navLinkLabel',
  {
    defaultMessage: 'AI security',
  }
);

export const TILES_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.title',
  { defaultMessage: 'Installs that need your attention' }
);
export const TILE_UNSANCTIONED_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.unsanctioned.title',
  { defaultMessage: 'Unsanctioned' }
);
export const TILE_UNSANCTIONED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.unsanctioned.description',
  { defaultMessage: 'On the Unsanctioned AI agents watchlist' }
);
export const TILE_PERSON_WATCHLISTS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.personWatchlists.title',
  { defaultMessage: 'Acting for people on watchlists' }
);
export const TILE_PERSON_WATCHLISTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.personWatchlists.description',
  { defaultMessage: 'Signed in as someone on a watchlist' }
);
export const TILE_HIGH_IMPACT_HOSTS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.highImpactHosts.title',
  { defaultMessage: 'On high-impact hosts' }
);
export const TILE_HIGH_IMPACT_HOSTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.highImpactHosts.description',
  { defaultMessage: 'Host criticality is high or extreme impact' }
);
export const TILE_NEW_INSTALLS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.newInstalls.title',
  { defaultMessage: 'New in the last 7 days' }
);
export const TILE_NEW_INSTALLS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.newInstalls.description',
  { defaultMessage: 'Installs first seen this week' }
);
export const TILE_RUNS_AS_ROOT_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.runsAsRoot.title',
  { defaultMessage: 'Running as root' }
);
export const TILE_RUNS_AS_ROOT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.runsAsRoot.description',
  { defaultMessage: 'The OS user is root' }
);

export const INSTALLS_SHOWN = (shown: number, total: number) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.aiSecurity.installsShown', {
    defaultMessage: 'Showing {shown} of {total} {total, plural, one {install} other {installs}}',
    values: { shown, total },
  });

export const UNSANCTIONED_BADGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.unsanctionedBadge',
  { defaultMessage: 'Unsanctioned' }
);
export const UNSANCTIONED_BADGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.unsanctionedBadgeTooltip',
  { defaultMessage: 'On the Unsanctioned AI agents watchlist' }
);
export const HOST_CRITICALITY_TOOLTIP = (level: string) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.aiSecurity.hostCriticalityTooltip', {
    defaultMessage: 'Host criticality: {level}',
    values: { level },
  });

export const SETUP_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.setupCallout.title',
  { defaultMessage: 'Decide which AI agents are unsanctioned' }
);
export const SETUP_CALLOUT_BODY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.setupCallout.body',
  {
    defaultMessage:
      'Your organization decides what counts as unsanctioned. Add a source to the Unsanctioned AI agents watchlist or assign agents to it. Those agents are then marked here and their risk goes up.',
  }
);
export const SETUP_CALLOUT_LINK = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.setupCallout.link',
  { defaultMessage: 'Set up the watchlist' }
);

export const GROUP_BY_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.groupBy.title',
  { defaultMessage: 'Group by' }
);
export const GROUP_BY_PERSON = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.groupBy.person',
  { defaultMessage: 'Person' }
);
export const GROUP_BY_HOST = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.groupBy.host',
  { defaultMessage: 'Host' }
);
export const GROUP_NO_MATCHING_PERSON = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.group.noMatchingPerson',
  { defaultMessage: 'No matching person' }
);
export const GROUP_NO_ACCOUNT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.group.noAccount',
  { defaultMessage: 'No signed-in account' }
);
export const GROUP_STAT_INSTALLS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.group.stat.installs',
  { defaultMessage: 'Installs:' }
);
export const GROUP_STAT_HOSTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.group.stat.hosts',
  { defaultMessage: 'Hosts:' }
);
export const GROUP_STAT_AGENTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.group.stat.agents',
  { defaultMessage: 'Agents:' }
);
export const GROUP_STAT_PEOPLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.group.stat.people',
  { defaultMessage: 'People:' }
);
export const GROUP_STAT_MAX_RISK = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.group.stat.maxRisk',
  { defaultMessage: 'Highest agent risk:' }
);
export const GROUP_STAT_ALERTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.group.stat.openAlerts',
  { defaultMessage: 'Open alerts:' }
);

export const HUNT_WITH_AI = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.huntWithAi',
  { defaultMessage: 'Hunt with AI' }
);

export const COLUMN_AGENT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.columns.agent',
  { defaultMessage: 'Agent' }
);
export const COLUMN_HOST = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.columns.host',
  { defaultMessage: 'Host' }
);
export const COLUMN_RUNS_AS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.columns.runsAs',
  {
    defaultMessage: 'Runs as',
  }
);
export const COLUMN_SIGNED_IN_AS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.columns.signedInAs',
  {
    defaultMessage: 'Signed in as',
  }
);
export const COLUMN_LAST_SEEN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.columns.lastSeen',
  {
    defaultMessage: 'Last seen',
  }
);
export const COLUMN_ALERTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.columns.openAlerts',
  {
    defaultMessage: 'Open alerts',
  }
);
export const COLUMN_AGENT_RISK = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.columns.agentRisk',
  { defaultMessage: 'Agent risk' }
);
export const COLUMN_AGENT_RISK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.columns.agentRiskTooltip',
  { defaultMessage: 'Risk score of this install, from alerts on it and its watchlists.' }
);
export const COLUMN_WATCHLISTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.columns.watchlists',
  { defaultMessage: 'Watchlists' }
);
export const WATCHLISTS_OVERFLOW_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.watchlistsOverflowTitle',
  { defaultMessage: 'Additional watchlists' }
);

export const ALERTS_UNAVAILABLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.alertsUnavailable',
  {
    defaultMessage: 'The alerts index could not be read, so alert counts are not shown.',
  }
);
export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.searchPlaceholder',
  {
    defaultMessage: 'Search agent, host, OS user, person, account or watchlist',
  }
);
export const OPEN_FLYOUT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.openFlyout',
  {
    defaultMessage: 'Open agent details',
  }
);
export const EMPTY_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.emptyTitle',
  {
    defaultMessage: 'No AI agents in the Entity Store',
  }
);
export const EMPTY_BODY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.emptyBody',
  {
    defaultMessage:
      'Agents appear once Elastic Defend reports process.ai_agent fields and the Entity Store extracts them.',
  }
);
export const LOAD_ERROR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.loadError',
  {
    defaultMessage: 'AI agents could not be loaded',
  }
);
