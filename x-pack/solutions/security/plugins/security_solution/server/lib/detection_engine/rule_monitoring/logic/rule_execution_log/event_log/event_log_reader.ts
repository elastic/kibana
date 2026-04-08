/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type {
  ReadRuleExecutionResultsResponse,
  UnifiedExecutionResultSortField,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { assertUnreachable } from '../../../../../../../common/utility_types';

import { withSecuritySpan } from '../../../../../../utils/with_security_span';

import type { GetUnifiedExecutionResultsArgs } from '../client_for_routes/client_interface';

import { RULE_SAVED_OBJECT_TYPE } from '../../event_log/event_log_constants';
import { constructUnifiedExecutionEventKqlFilter } from './construct_unified_execution_event_kql_filter';
import { mapEventToUnifiedResult } from './map_event_to_unified_result';

export interface IEventLogReader {
  getUnifiedExecutionResults(
    args: GetUnifiedExecutionResultsArgs
  ): Promise<ReadRuleExecutionResultsResponse>;
}

export const createEventLogReader = (eventLog: IEventLogClient): IEventLogReader => {
  return {
    async getUnifiedExecutionResults(
      args: GetUnifiedExecutionResultsArgs
    ): Promise<ReadRuleExecutionResultsResponse> {
      const { ruleId, filter: filterParams, sort, page, perPage } = args;
      const { from, to, outcome, run_type: runType } = filterParams ?? {};
      const sortField = sort?.field ?? 'execution_start';
      const sortOrder = sort?.order ?? 'desc';

      const findResult = await withSecuritySpan('findEventsBySavedObjectIds', () => {
        return eventLog.findEventsBySavedObjectIds(RULE_SAVED_OBJECT_TYPE, [ruleId], {
          filter: constructUnifiedExecutionEventKqlFilter({ outcome, runType }),
          sort: [{ sort_field: mapUnifiedSortField(sortField), sort_order: sortOrder }],
          page,
          per_page: perPage,
          start: from,
          end: to,
        });
      });

      return {
        data: findResult.data.map(mapEventToUnifiedResult),
        total: findResult.total,
        page: findResult.page,
        per_page: findResult.per_page,
      };
    },
  };
};

const mapUnifiedSortField = (sortField: UnifiedExecutionResultSortField): string => {
  switch (sortField) {
    case 'execution_start':
      return 'event.start';
    case 'execution_duration_ms':
      return 'event.duration';
    default:
      return assertUnreachable(sortField);
  }
};

