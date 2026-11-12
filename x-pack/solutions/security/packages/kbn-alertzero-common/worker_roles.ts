/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from './constants';

/** Security's public role API, used to look up the built-in worker roles. */
export const SECURITY_ROLE_API_VERSION = '2023-10-31' as const;
export const buildSecurityRoleUrl = (roleName: string) =>
  `/api/security/role/${encodeURIComponent(roleName)}`;

/**
 * The service account each worker runs as. Its role is built in: an Elasticsearch reserved role on
 * stateful and an elasticsearch-controller predefined role on Serverless. AlertZero never creates
 * or changes these roles.
 */
export const WORKER_SERVICE_ACCOUNT_NAMES: Readonly<Record<string, string>> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: 'alertzero_alert_triage',
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: 'alertzero_attack_discovery',
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: 'alertzero_endpoint_analysis',
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: 'alertzero_threat_hunt',
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: 'alertzero_rule_tuning',
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: 'alertzero_rule_coverage',
};

/**
 * The built-in role a worker's service account gets. Stateful ships it as an Elasticsearch
 * reserved role named like the account. Serverless ships it as a predefined role, whose name must
 * start with `_`.
 */
export const getWorkerRoleName = (name: string, { isServerless }: { isServerless: boolean }) =>
  isServerless ? `_${name}` : name;
