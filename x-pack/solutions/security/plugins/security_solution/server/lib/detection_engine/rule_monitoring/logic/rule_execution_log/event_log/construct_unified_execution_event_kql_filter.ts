/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_PROVIDER } from '../../event_log/event_log_constants';
import * as f from '../../event_log/event_log_fields';
import { kqlAnd, kqlOr } from '../../utils/kql';
import { RuleRunTypeEnum } from '../../../../../../../common/api/detection_engine/rule_monitoring';

export const constructUnifiedExecutionEventKqlFilter = (filter: {
  outcome?: string[];
  runType?: string[];
}): string => {
  const filters: string[] = [`${f.EVENT_PROVIDER}:${ALERTING_PROVIDER}`];

  /* Filter by run type */
  const hasNoRunTypeFilter = !filter.runType?.length;

  const actions: string[] = [];
  if (filter.runType?.includes(RuleRunTypeEnum.standard) || hasNoRunTypeFilter) {
    // Standard (scheduled) runs produce "execute" events
    actions.push('execute');
  }
  if (filter.runType?.includes(RuleRunTypeEnum.backfill) || hasNoRunTypeFilter) {
    // Backfill (manual) runs produce "execute-backfill" events
    actions.push('execute-backfill');
  }
  filters.push(`${f.EVENT_ACTION}:(${kqlOr(actions)})`);

  /* Filter by outcome */
  if (filter.outcome && filter.outcome.length > 0) {
    filters.push(`${f.RULE_EXECUTION_OUTCOME}:(${kqlOr(filter.outcome)})`);
  } else {
    filters.push(`${f.RULE_EXECUTION_OUTCOME}:*`);
  }

  return kqlAnd(filters);
};
