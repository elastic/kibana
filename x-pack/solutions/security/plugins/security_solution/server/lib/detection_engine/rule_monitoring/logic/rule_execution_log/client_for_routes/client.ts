/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';

import type {
  ReadRuleExecutionResultsResponse,
  UnifiedExecutionResultSortField,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { assertUnreachable } from '../../../../../../../common/utility_types';

import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import type { ExtMeta } from '../../utils/console_logging';
import type {
  GetUnifiedExecutionResultsArgs,
  IRuleExecutionLogForRoutes,
} from './client_interface';

import { RULE_SAVED_OBJECT_TYPE } from '../../event_log/event_log_constants';
import { constructUnifiedExecutionEventKqlFilter } from '../event_log/construct_unified_execution_event_kql_filter';
import { mapEventToUnifiedResult } from '../event_log/map_event_to_unified_result';

export const createRuleExecutionLogClientForRoutes = (
  eventLog: IEventLogClient,
  logger: Logger
): IRuleExecutionLogForRoutes => {
  return {
    getUnifiedExecutionResults: (
      args: GetUnifiedExecutionResultsArgs
    ): Promise<ReadRuleExecutionResultsResponse> => {
      return withSecuritySpan('IRuleExecutionLogForRoutes.getUnifiedExecutionResults', async () => {
        const { ruleId } = args;
        try {
          const { filter: filterParams, sort, page, perPage } = args;
          const { from, to, outcome, run_type: runType } = filterParams ?? {};
          const sortField = sort?.field ?? 'execution_start';
          const sortOrder = sort?.order ?? 'desc';

          const findResult = await eventLog.findEventsBySavedObjectIds(
            RULE_SAVED_OBJECT_TYPE,
            [ruleId],
            {
              filter: constructUnifiedExecutionEventKqlFilter({ outcome, runType }),
              sort: [{ sort_field: mapSortField(sortField), sort_order: sortOrder }],
              page,
              per_page: perPage,
              start: from,
              end: to,
            }
          );

          return {
            data: findResult.data.map(mapEventToUnifiedResult),
            total: findResult.total,
            page: findResult.page,
            per_page: findResult.per_page,
          };
        } catch (e) {
          const logMessage = 'Error getting unified execution results from event log';
          const logReason = e instanceof Error ? e.message : String(e);
          const logSuffix = `[rule id ${ruleId}]`;
          const logMeta: ExtMeta = { rule: { id: ruleId } };

          logger.error(`${logMessage}: ${logReason} ${logSuffix}`, logMeta);
          throw e;
        }
      });
    },
  };
};

const mapSortField = (sortField: UnifiedExecutionResultSortField): string => {
  switch (sortField) {
    case 'execution_start':
      return 'event.start';
    case 'execution_duration_ms':
      return 'event.duration';
    default:
      return assertUnreachable(sortField);
  }
};
