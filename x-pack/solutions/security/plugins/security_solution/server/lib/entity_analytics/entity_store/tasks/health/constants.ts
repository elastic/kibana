/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntervalSchedule } from '@kbn/task-manager-plugin/server/task';

export const SCOPE = ['securitySolution'];
export const TYPE = 'entity_store:health';
export const VERSION = '1.0.0';
export const TIMEOUT = '3m';
export const MAX_ATTEMPTS = 5;
export const SCHEDULE = {
  interval: '1h',
} as IntervalSchedule;
