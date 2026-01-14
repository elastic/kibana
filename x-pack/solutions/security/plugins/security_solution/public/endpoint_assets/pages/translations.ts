/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.endpointAssets.pageTitle',
  {
    defaultMessage: 'Endpoint Assets',
  }
);

export const PAGE_SUBTITLE = i18n.translate(
  'xpack.securitySolution.endpointAssets.pageSubtitle',
  {
    defaultMessage: 'Security Posture & Asset Visibility powered by Osquery',
  }
);

export const TAB_INVENTORY = i18n.translate(
  'xpack.securitySolution.endpointAssets.tabInventory',
  {
    defaultMessage: 'Inventory',
  }
);

export const TAB_POSTURE = i18n.translate(
  'xpack.securitySolution.endpointAssets.tabPosture',
  {
    defaultMessage: 'Security Posture',
  }
);

export const TAB_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.endpointAssets.tabPrivileges',
  {
    defaultMessage: 'Privileges',
  }
);

export const TAB_DRIFT = i18n.translate(
  'xpack.securitySolution.endpointAssets.tabDrift',
  {
    defaultMessage: 'Drift',
  }
);

export const TOTAL_ASSETS = i18n.translate(
  'xpack.securitySolution.endpointAssets.totalAssets',
  {
    defaultMessage: 'Total Assets',
  }
);

export const ACTIVE_24H = i18n.translate(
  'xpack.securitySolution.endpointAssets.active24h',
  {
    defaultMessage: 'Active (24h)',
  }
);

export const CRITICAL_POSTURE = i18n.translate(
  'xpack.securitySolution.endpointAssets.criticalPosture',
  {
    defaultMessage: 'Critical Posture',
  }
);

export const ELEVATED_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.endpointAssets.elevatedPrivileges',
  {
    defaultMessage: 'Elevated Privileges',
  }
);

export const RECENTLY_CHANGED = i18n.translate(
  'xpack.securitySolution.endpointAssets.recentlyChanged',
  {
    defaultMessage: 'Recently Changed',
  }
);

export const REFRESH = i18n.translate(
  'xpack.securitySolution.endpointAssets.refresh',
  {
    defaultMessage: 'Refresh',
  }
);

export const COLUMN_NAME = i18n.translate(
  'xpack.securitySolution.endpointAssets.columnName',
  {
    defaultMessage: 'Name',
  }
);

export const COLUMN_PLATFORM = i18n.translate(
  'xpack.securitySolution.endpointAssets.columnPlatform',
  {
    defaultMessage: 'Platform',
  }
);

export const COLUMN_POSTURE_SCORE = i18n.translate(
  'xpack.securitySolution.endpointAssets.columnPostureScore',
  {
    defaultMessage: 'Posture Score',
  }
);

export const COLUMN_ADMIN_COUNT = i18n.translate(
  'xpack.securitySolution.endpointAssets.columnAdminCount',
  {
    defaultMessage: 'Admins',
  }
);

export const COLUMN_LAST_SEEN = i18n.translate(
  'xpack.securitySolution.endpointAssets.columnLastSeen',
  {
    defaultMessage: 'Last Seen',
  }
);

export const NO_ASSETS_FOUND = i18n.translate(
  'xpack.securitySolution.endpointAssets.noAssetsFound',
  {
    defaultMessage: 'No endpoint assets found',
  }
);

export const POSTURE_OK = i18n.translate(
  'xpack.securitySolution.endpointAssets.postureOk',
  {
    defaultMessage: 'OK',
  }
);

export const POSTURE_FAIL = i18n.translate(
  'xpack.securitySolution.endpointAssets.postureFail',
  {
    defaultMessage: 'FAIL',
  }
);

export const DISK_ENCRYPTION = i18n.translate(
  'xpack.securitySolution.endpointAssets.diskEncryption',
  {
    defaultMessage: 'Disk Encryption',
  }
);

export const FIREWALL = i18n.translate(
  'xpack.securitySolution.endpointAssets.firewall',
  {
    defaultMessage: 'Firewall',
  }
);

export const SECURE_BOOT = i18n.translate(
  'xpack.securitySolution.endpointAssets.secureBoot',
  {
    defaultMessage: 'Secure Boot',
  }
);

export const LOCAL_ADMINS = i18n.translate(
  'xpack.securitySolution.endpointAssets.localAdmins',
  {
    defaultMessage: 'Local Admins',
  }
);

export const ELASTIC_AGENT = i18n.translate(
  'xpack.securitySolution.endpointAssets.elasticAgent',
  {
    defaultMessage: 'Elastic Agent',
  }
);

export const DRIFT_EVENTS = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftEvents',
  {
    defaultMessage: 'Events',
  }
);

export const DRIFT_EVENTS_24H = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftEvents24h',
  {
    defaultMessage: 'Events (24h)',
  }
);

export const DRIFT_CRITICAL = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftCritical',
  {
    defaultMessage: 'Critical',
  }
);

export const DRIFT_HIGH = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftHigh',
  {
    defaultMessage: 'High',
  }
);

export const DRIFT_ASSETS_CHANGED = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftAssetsChanged',
  {
    defaultMessage: 'Assets Changed',
  }
);

export const DRIFT_EVENTS_BY_CATEGORY = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftEventsByCategory',
  {
    defaultMessage: 'Events by Category',
  }
);

export const DRIFT_RECENT_CHANGES = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftRecentChanges',
  {
    defaultMessage: 'Recent Changes',
  }
);

export const DRIFT_CATEGORY_PERSISTENCE = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftCategoryPersistence',
  {
    defaultMessage: 'Persistence',
  }
);

export const DRIFT_CATEGORY_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftCategoryPrivileges',
  {
    defaultMessage: 'Privileges',
  }
);

export const DRIFT_CATEGORY_NETWORK = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftCategoryNetwork',
  {
    defaultMessage: 'Network',
  }
);

export const DRIFT_CATEGORY_SOFTWARE = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftCategorySoftware',
  {
    defaultMessage: 'Software',
  }
);

export const DRIFT_CATEGORY_POSTURE = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftCategoryPosture',
  {
    defaultMessage: 'Posture',
  }
);

export const DRIFT_COLUMN_TIME = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftColumnTime',
  {
    defaultMessage: 'Time',
  }
);

export const DRIFT_COLUMN_HOST = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftColumnHost',
  {
    defaultMessage: 'Host',
  }
);

export const DRIFT_COLUMN_CATEGORY = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftColumnCategory',
  {
    defaultMessage: 'Category',
  }
);

export const DRIFT_COLUMN_CHANGE = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftColumnChange',
  {
    defaultMessage: 'Change',
  }
);

export const DRIFT_COLUMN_SEVERITY = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftColumnSeverity',
  {
    defaultMessage: 'Severity',
  }
);

export const DRIFT_ERROR_LOADING = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftErrorLoading',
  {
    defaultMessage: 'Error loading drift summary',
  }
);

export const DRIFT_NO_CHANGES = i18n.translate(
  'xpack.securitySolution.endpointAssets.driftNoChanges',
  {
    defaultMessage: 'No drift events detected in the selected time range',
  }
);

// Unknown Knowns (Dormant Risk) Translations
export const TAB_UNKNOWN_KNOWNS = i18n.translate(
  'xpack.securitySolution.endpointAssets.tabUnknownKnowns',
  {
    defaultMessage: 'Dormant Risks',
  }
);

export const UNKNOWN_KNOWNS_ASSETS_AT_RISK = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsAssetsAtRisk',
  {
    defaultMessage: 'Assets at Risk',
  }
);

export const UNKNOWN_KNOWNS_ASSETS_AT_RISK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsAssetsAtRiskTooltip',
  {
    defaultMessage: 'Assets with at least one dormant risk indicator',
  }
);

export const UNKNOWN_KNOWNS_OF_TOTAL_ASSETS = (total: number) =>
  i18n.translate('xpack.securitySolution.endpointAssets.unknownKnownsOfTotalAssets', {
    defaultMessage: 'of {total} total assets',
    values: { total },
  });

export const UNKNOWN_KNOWNS_SSH_KEYS = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsSshKeys',
  {
    defaultMessage: 'Old SSH Keys',
  }
);

export const UNKNOWN_KNOWNS_SSH_KEYS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsSshKeysTooltip',
  {
    defaultMessage: 'SSH authorized keys older than 180 days that have not been rotated',
  }
);

export const UNKNOWN_KNOWNS_DORMANT_USERS = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsDormantUsers',
  {
    defaultMessage: 'Dormant Users',
  }
);

export const UNKNOWN_KNOWNS_DORMANT_USERS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsDormantUsersTooltip',
  {
    defaultMessage: 'User accounts with no login activity in the last 30 days',
  }
);

export const UNKNOWN_KNOWNS_EXTERNAL_TASKS = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsExternalTasks',
  {
    defaultMessage: 'External Tasks',
  }
);

export const UNKNOWN_KNOWNS_EXTERNAL_TASKS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsExternalTasksTooltip',
  {
    defaultMessage:
      'Scheduled tasks, cron jobs, and launch items that call external URLs or resources',
  }
);

export const UNKNOWN_KNOWNS_RISK_DISTRIBUTION = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsRiskDistribution',
  {
    defaultMessage: 'Risk Distribution',
  }
);

export const UNKNOWN_KNOWNS_HIGH = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsHigh',
  {
    defaultMessage: 'High',
  }
);

export const UNKNOWN_KNOWNS_MEDIUM = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsMedium',
  {
    defaultMessage: 'Medium',
  }
);

export const UNKNOWN_KNOWNS_LOW = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsLow',
  {
    defaultMessage: 'Low',
  }
);

export const UNKNOWN_KNOWNS_TOP_RISK_ASSETS = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsTopRiskAssets',
  {
    defaultMessage: 'Top Assets by Dormant Risk',
  }
);

export const UNKNOWN_KNOWNS_TOP_DORMANT_USERS = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsTopDormantUsers',
  {
    defaultMessage: 'Most Common Dormant Users',
  }
);

export const UNKNOWN_KNOWNS_COLUMN_HOST = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsColumnHost',
  {
    defaultMessage: 'Host',
  }
);

export const UNKNOWN_KNOWNS_COLUMN_RISKS = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsColumnRisks',
  {
    defaultMessage: 'Risks',
  }
);

export const UNKNOWN_KNOWNS_COLUMN_RISK_LEVEL = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsColumnRiskLevel',
  {
    defaultMessage: 'Level',
  }
);

export const UNKNOWN_KNOWNS_COLUMN_USERNAME = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsColumnUsername',
  {
    defaultMessage: 'Username',
  }
);

export const UNKNOWN_KNOWNS_COLUMN_ASSET_COUNT = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsColumnAssetCount',
  {
    defaultMessage: 'Assets',
  }
);

export const UNKNOWN_KNOWNS_ERROR_LOADING = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsErrorLoading',
  {
    defaultMessage: 'Error loading dormant risks summary',
  }
);

export const UNKNOWN_KNOWNS_NO_RISKS = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsNoRisks',
  {
    defaultMessage: 'No dormant risks detected',
  }
);

export const UNKNOWN_KNOWNS_NO_RISKS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpointAssets.unknownKnownsNoRisksDescription',
  {
    defaultMessage:
      'No old SSH keys, dormant users, or external scheduled tasks were detected across your fleet.',
  }
);
