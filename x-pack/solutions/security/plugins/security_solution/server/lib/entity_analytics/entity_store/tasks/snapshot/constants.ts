/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import type { RruleSchedule } from '@kbn/task-manager-plugin/server/task';

export const SCOPE = ['securitySolution'];
export const TYPE = 'entity_store:snapshot';
export const VERSION = '1.0.0';
export const TIMEOUT = '1h';
export const MAX_ATTEMPTS = 5;
// Run every day at 00:01 UTC
export const SCHEDULE = {
  rrule: {
    freq: Frequency.DAILY,
    tzid: 'UTC',
    interval: 1,
    byhour: [0],
    byminute: [1],
  },
} as RruleSchedule;
