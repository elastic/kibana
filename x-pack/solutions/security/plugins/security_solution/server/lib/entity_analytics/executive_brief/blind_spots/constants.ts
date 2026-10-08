/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ALERTS_INDEX } from '../../../../../common/constants';

/** Open and acknowledged alerts count as "activity"; closed ones do not. */
export const ACTIVE_WORKFLOW_STATUSES = ['open', 'acknowledged'] as const;

export const RULE_TACTIC_FIELD = 'kibana.alert.rule.threat.tactic.id';
export const ECS_TACTIC_FIELD = 'threat.tactic.id';
export const AD_TACTICS_FIELD = 'kibana.alert.attack_discovery.mitre_attack_tactics';

export const MAX_TACTIC_BUCKETS = 30;
export const MAX_TOP_RULES_PER_TACTIC = 3;
export const MAX_RULE_BUCKETS = 200;
export const MAX_RULES_FETCH = 10000;

/** ML anomaly records below this record_score are ignored (minor and above). */
export const ML_ANOMALY_MIN_SCORE = 25;

/** Attack Discovery, hunting leads and risk scoring are "stale" past these ages. */
export const AD_STALE_DAYS = 7;
export const LEADS_STALE_DAYS = 7;
export const RISK_ENGINE_STALE_HOURS = 24;

/** Share of alerts (0..1) at or above which an attribution / mapping gap is raised. */
export const UNMAPPED_ALERT_GAP_MIN_SHARE = 0.1;
export const UNATTRIBUTED_ALERT_GAP_MIN_SHARE = 0.1;

export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

export const MITRE_ATTACK_FRAMEWORK_NAME = 'MITRE ATT&CK';
export const MAX_ENTITY_DOCS = 500;

export const getAlertsIndex = (spaceId: string): string => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

export const getAttackDiscoveryIndices = (spaceId: string): string[] => [
  `.alerts-security.attack.discovery.alerts-${spaceId}`,
  `.adhoc.alerts-security.attack.discovery.alerts-${spaceId}`,
];

export const APP_LINKS = {
  entityStore: '/app/security/entity_analytics_entity_store',
  assetCriticality: '/app/security/entity_analytics_asset_criticality',
  entityAnalyticsManagement: '/app/security/entity_analytics_management',
  entityAnalyticsHome: '/app/security/entity_analytics_home_page',
  attackDiscovery: '/app/security/attack_discovery',
  coverageOverview: '/app/security/rules_coverage_overview',
  rules: '/app/security/rules',
  alerts: '/app/security/alerts',
  mlJobs: '/app/ml/jobs',
  integration: (pkg: string): string => `/app/integrations/detail/${pkg}/overview`,
} as const;
