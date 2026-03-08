/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  AlertInstanceContext,
  RuleExecutorOptions,
  RuleType,
  RuleTypeState,
} from '@kbn/alerting-plugin/server';
import type {
  AttackDiscoveryAlertDocument,
  AttackDiscoveryScheduleParams,
} from '@kbn/elastic-assistant-common';

export type AttackDiscoveryScheduleContext = AlertInstanceContext & {
  attack: {
    alertIds: string[];
    detailsMarkdown: string;
    detailsUrl?: string;
    entitySummaryMarkdown?: string;
    mitreAttackTactics?: string[];
    summaryMarkdown: string;
    timestamp?: string;
    title: string;
  };
};

export type AttackDiscoveryExecutorOptions = RuleExecutorOptions<
  AttackDiscoveryScheduleParams,
  RuleTypeState,
  {},
  AttackDiscoveryScheduleContext,
  'default',
  AttackDiscoveryAlertDocument
>;

export type AttackDiscoveryScheduleType = RuleType<
  AttackDiscoveryScheduleParams,
  never,
  RuleTypeState,
  {},
  AttackDiscoveryScheduleContext,
  'default',
  never,
  AttackDiscoveryAlertDocument
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
