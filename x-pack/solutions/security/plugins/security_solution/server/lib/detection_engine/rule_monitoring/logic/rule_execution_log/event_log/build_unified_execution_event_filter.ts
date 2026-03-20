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

export const buildUnifiedExecutionEventFilter = (filter: {
  outcome?: string[];
  runType?: string[];
}): string => {
  const { outcome: statusFilters, runType: runTypeFilters } = filter;
  const filters: string[] = [];

  filters.push(`${f.EVENT_PROVIDER}:${ALERTING_PROVIDER}`);
  filters.push(`${f.EVENT_ACTION}:(${kqlOr(['execute', 'execute-backfill'])})`);

  if (statusFilters && statusFilters.length > 0) {
    filters.push(`${f.RULE_EXECUTION_OUTCOME}:(${kqlOr(statusFilters)})`);
  } else {
    // Only include events that have an outcome.
    filters.push(`${f.RULE_EXECUTION_OUTCOME}:*`);
  }

  const hasStandard = runTypeFilters?.includes(RuleRunTypeEnum.standard);
  const hasBackfill = runTypeFilters?.includes(RuleRunTypeEnum.backfill);

  if (hasStandard && !hasBackfill) {
    filters.push(`NOT kibana.alert.rule.execution.backfill:*`);
  } else if (hasBackfill && !hasStandard) {
    filters.push(`kibana.alert.rule.execution.backfill:*`);
  }
  // If both or neither run types selected – no run type filter

  return kqlAnd(filters);
};
