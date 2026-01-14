/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import type { RruleSchedule } from '@kbn/task-manager-plugin/server/task';

export const SCOPE = ['securitySolution'];
export const TYPE = 'endpoint_assets:posture_comparison';
export const VERSION = '1.0.0';
export const TIMEOUT = '30m';
export const MAX_ATTEMPTS = 3;

// Run daily at 00:30 UTC (after Entity Store snapshot task which runs at 00:01 UTC)
export const SCHEDULE = {
  rrule: {
    freq: Frequency.DAILY,
    tzid: 'UTC',
    interval: 1,
    byhour: [0],
    byminute: [30],
  },
} as RruleSchedule;

// Posture fields to compare between snapshots
export const POSTURE_COMPARISON_FIELDS = [
  'endpoint.posture.disk_encryption',
  'endpoint.posture.firewall_enabled',
  'endpoint.posture.secure_boot',
  'endpoint.posture.score',
] as const;

// Mapping of field names to drift item types
export const POSTURE_FIELD_TO_DRIFT_TYPE: Record<string, string> = {
  'endpoint.posture.disk_encryption': 'disk_encryption',
  'endpoint.posture.firewall_enabled': 'firewall',
  'endpoint.posture.secure_boot': 'secure_boot',
  'endpoint.posture.score': 'posture_score',
};
