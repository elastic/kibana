/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_PROVIDER, RULE_SAVED_OBJECT_TYPE } from '../../event_log/event_log_constants';
import * as f from '../../event_log/event_log_fields';
import { kqlAnd, kqlOr } from '../../utils/kql';

export const UNIFIED_EVENT_PROVIDER = ALERTING_PROVIDER;
export const UNIFIED_EVENT_ACTIONS = ['execute', 'execute-backfill'] as const;
export const UNIFIED_EVENT_SO_TYPE = RULE_SAVED_OBJECT_TYPE;

/**
 * Builds a KQL filter for querying unified execution events.
 */
export const buildUnifiedExecutionEventFilter = (filter: {
  status?: string[];
  runType?: string[];
}): string => {
  const { status: statusFilters, runType: runTypeFilters } = filter;
  const filters: string[] = [];

  filters.push(`${f.EVENT_PROVIDER}:${UNIFIED_EVENT_PROVIDER}`);
  filters.push(`${f.EVENT_ACTION}:(${kqlOr([...UNIFIED_EVENT_ACTIONS])})`);

  if (statusFilters && statusFilters.length > 0) {
    const outcomeValues = statusFilters.map((s) => {
      switch (s) {
        case 'succeeded':
          return 'success';
        case 'warning':
        case 'partial failure':
          return 'warning';
        case 'failed':
          return 'failure';
        default:
          return s;
      }
    });
    filters.push(`${f.RULE_EXECUTION_OUTCOME}:(${kqlOr(outcomeValues)})`);
  }

  if (runTypeFilters && runTypeFilters.length === 1) {
    if (runTypeFilters[0] === 'standard') {
      filters.push(`NOT kibana.alert.rule.execution.backfill:*`);
    } else if (runTypeFilters[0] === 'backfill') {
      filters.push(`kibana.alert.rule.execution.backfill:*`);
    }
  }

  return kqlAnd(filters);
};
