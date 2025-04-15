/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { RuleExecutorOptions, RuleType, RuleTypeState } from '@kbn/alerting-plugin/server';
import { SecurityAttackDiscoveryAlert } from '@kbn/alerts-as-data-utils';
import { AttackDiscoveryScheduleParams } from '@kbn/elastic-assistant-common';

export type AttackDiscoveryExecutorOptions = RuleExecutorOptions<
  AttackDiscoveryScheduleParams,
  RuleTypeState,
  {},
  {},
  'default',
  SecurityAttackDiscoveryAlert
>;

export type AttackDiscoveryScheduleType = RuleType<
  AttackDiscoveryScheduleParams,
  never,
  RuleTypeState,
  {},
  {},
  'default',
  never,
  SecurityAttackDiscoveryAlert
>;

export interface AttackDiscoveryScheduleSort {
  sortDirection?: estypes.SortOrder;
  sortField?: string;
}

export interface AttackDiscoveryScheduleFindOptions {
  page?: number;
  perPage?: number;
  sort?: AttackDiscoveryScheduleSort;
}
