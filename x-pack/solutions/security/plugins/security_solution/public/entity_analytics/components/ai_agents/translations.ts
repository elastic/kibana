/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.pageTitle',
  { defaultMessage: 'AI agents' }
);

export const PAGE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.pageDescription',
  {
    defaultMessage:
      'One row per install of an AI coding agent, from the Entity Store. Select a row for its context, alerts and activity.',
  }
);

export const POC_BADGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.pocBadge',
  {
    defaultMessage: 'Proof of concept',
  }
);

export const NAV_LINK_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.navLinkLabel',
  {
    defaultMessage: 'AI agents',
  }
);

export const TILE_INSTALLS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.tiles.installs',
  {
    defaultMessage: 'Agent installs',
  }
);
export const TILE_WITH_ALERTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.tiles.withAlerts',
  {
    defaultMessage: 'Installs with open alerts',
  }
);
export const TILE_SHARED_ACCOUNTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.tiles.sharedAccounts',
  {
    defaultMessage: 'Accounts on more than one install',
  }
);
export const TILE_RUNS_AS_ROOT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.tiles.runsAsRoot',
  {
    defaultMessage: 'Installs running as root',
  }
);

export const COLUMN_AGENT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.columns.agent',
  { defaultMessage: 'Agent' }
);
export const COLUMN_HOST = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.columns.host',
  { defaultMessage: 'Host' }
);
export const COLUMN_RUNS_AS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.columns.runsAs',
  {
    defaultMessage: 'Runs as',
  }
);
export const COLUMN_ACCOUNTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.columns.accounts',
  {
    defaultMessage: 'Accounts seen',
  }
);
export const COLUMN_VERSION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.columns.version',
  {
    defaultMessage: 'Version',
  }
);
export const COLUMN_FIRST_SEEN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.columns.firstSeen',
  {
    defaultMessage: 'First seen',
  }
);
export const COLUMN_LAST_SEEN = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.columns.lastSeen',
  {
    defaultMessage: 'Last seen',
  }
);
export const COLUMN_ALERTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.columns.openAlerts',
  {
    defaultMessage: 'Open alerts',
  }
);
export const COLUMN_RISK = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.columns.risk',
  { defaultMessage: 'Risk' }
);
export const COLUMN_WATCHLISTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.columns.watchlists',
  { defaultMessage: 'Watchlists' }
);
export const WATCHLISTS_OVERFLOW_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.watchlistsOverflowTitle',
  { defaultMessage: 'Additional watchlists' }
);

export const UNKNOWN_VERSION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.unknownVersion',
  {
    defaultMessage: 'Unknown',
  }
);
export const NO_ACCOUNT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.noAccount',
  {
    defaultMessage: 'None seen',
  }
);
export const NO_SCORE_YET = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.noScoreYet',
  {
    defaultMessage: 'No score yet',
  }
);
export const ALERTS_UNAVAILABLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.alertsUnavailable',
  {
    defaultMessage: 'The alerts index could not be read, so alert counts are not shown.',
  }
);
export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.searchPlaceholder',
  {
    defaultMessage: 'Search agent, host, OS user or account',
  }
);
export const OPEN_FLYOUT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.openFlyout',
  {
    defaultMessage: 'Open agent details',
  }
);
export const EMPTY_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.emptyTitle',
  {
    defaultMessage: 'No AI agents in the Entity Store',
  }
);
export const EMPTY_BODY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.emptyBody',
  {
    defaultMessage:
      'Agents appear once Elastic Defend reports process.ai_agent fields and the Entity Store extracts them.',
  }
);
export const LOAD_ERROR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.loadError',
  {
    defaultMessage: 'AI agents could not be loaded',
  }
);

export const MOCK_DATA_BADGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.mockDataBadge',
  {
    defaultMessage: 'Mock data',
  }
);
export const MOCK_DATA_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiAgents.mockDataTooltip',
  {
    defaultMessage:
      'Generated from a published schema because the real source was not collected. Tagged poc-mock.',
  }
);
