/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationSource } from './types';

export const TASK_STATS_POLLING_SLEEP_SECONDS = 10 as const;
export const START_STOP_POLLING_SLEEP_SECONDS = 1 as const;

export const MIGRATION_VENDOR_DISPLAY_NAME: Record<MigrationSource, string> = {
  [MigrationSource.SPLUNK]: 'Splunk',
  [MigrationSource.QRADAR]: 'QRadar',
};
