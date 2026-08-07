/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryGeneration } from '@kbn/elastic-assistant-common';

/**
 * A single schedule run shown in the execution logs table.
 *
 * Rows are sourced from the Alerting Framework execution log (so that *every*
 * run is listed, including failures that produced no generation) and enriched
 * with the matching attack discovery generation (correlated by execution UUID)
 * when one exists.
 */
export interface ScheduleRunRow {
  executionUuid: string;
  generation?: AttackDiscoveryGeneration;
  start: string;
  status: string;
}
