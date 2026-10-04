/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SKILL_ID = 'threat-hunting';
export const WORKER_ID = 'system-security-watch-deep-raw-log-corroboration-worker';
export const ORCHESTRATOR_ID = 'system-security-watch-deep';

export const INDICES = {
  LOGS: 'logs-*',
  ALERTS: '.alerts-security.alerts-*',
  INVESTIGATIONS: '.pnd-investigations',
} as const;

export const TOOL_IDS = {
  SEARCH: 'platform.core.search',
  THREAT_HUNTING: 'threat-hunting',
} as const;
