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

export const TILE_INSTALLS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.installs',
  {
    defaultMessage: 'Agent installs',
  }
);
export const TILE_WITH_ALERTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.withAlerts',
  {
    defaultMessage: 'Installs with open alerts',
  }
);
export const TILE_SHARED_ACCOUNTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.sharedAccounts',
  {
    defaultMessage: 'Accounts on more than one install',
  }
);
export const TILE_RUNS_AS_ROOT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.tiles.runsAsRoot',
  {
    defaultMessage: 'Installs running as root',
  }
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
export const COLUMN_RISK = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.columns.risk',
  { defaultMessage: 'Risk' }
);
export const COLUMN_WATCHLISTS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.columns.watchlists',
  { defaultMessage: 'Watchlists' }
);
export const WATCHLISTS_OVERFLOW_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.watchlistsOverflowTitle',
  { defaultMessage: 'Additional watchlists' }
);

export const UNKNOWN_VERSION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.unknownVersion',
  {
    defaultMessage: 'Unknown',
  }
);
export const NO_SCORE_YET = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.noScoreYet',
  {
    defaultMessage: 'No score yet',
  }
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
    defaultMessage: 'Search agent, host, OS user or account',
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

export const MOCK_DATA_BADGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.mockDataBadge',
  {
    defaultMessage: 'Mock data',
  }
);
export const MOCK_DATA_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.aiSecurity.mockDataTooltip',
  {
    defaultMessage:
      'Generated from a published schema because the real source was not collected. Tagged poc-mock.',
  }
);
