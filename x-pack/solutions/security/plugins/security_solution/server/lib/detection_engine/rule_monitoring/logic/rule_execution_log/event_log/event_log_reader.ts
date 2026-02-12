/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IEventLogClient, IValidatedEvent } from '@kbn/event-log-plugin/server';
import { MAX_EXECUTION_EVENTS_DISPLAYED } from '@kbn/securitysolution-rules';
import type {
  GetRuleExecutionEventsResponse,
  GetRuleExecutionResultsResponse,
  RuleExecutionEvent,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  RuleRunTypeEnum,
  LogLevel,
  LogLevelEnum,
  RuleExecutionEventType,
  RuleExecutionEventTypeEnum,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  RUN_TYPE_FILTERS,
  STATUS_FILTERS,
} from '../../../../../../../common/detection_engine/rule_management/execution_log';

import { prepareKQLStringParam } from '../../../../../../../common/utils/kql';

import { invariant } from '../../../../../../../common/utils/invariant';
import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import { kqlAnd, kqlOr } from '../../utils/kql';

import type {
  GetExecutionEventsArgs,
  GetExecutionResultsArgs,
} from '../client_for_routes/client_interface';
import {
  formatExecutionEventResponse,
  getExecutionEventAggregation,
  mapRuleExecutionStatusToPlatformStatus,
} from './aggregations/execution_results';
import type { ExecutionUuidAggResult } from './aggregations/execution_results/types';

import {
  RULE_EXECUTION_LOG_PROVIDER,
  RULE_SAVED_OBJECT_TYPE,
} from '../../event_log/event_log_constants';
import * as f from '../../event_log/event_log_fields';

export interface IEventLogReader {
  getExecutionEvents(args: GetExecutionEventsArgs): Promise<GetRuleExecutionEventsResponse>;
  getExecutionResults(args: GetExecutionResultsArgs): Promise<GetRuleExecutionResultsResponse>;
}

export const createEventLogReader = (eventLog: IEventLogClient): IEventLogReader => {
  return {
    async getExecutionEvents(
      args: GetExecutionEventsArgs
    ): Promise<GetRuleExecutionEventsResponse> {
      const {
        ruleId,
        searchTerm,
        eventTypes,
        logLevels,
        dateStart,
        dateEnd,
        sortOrder,
        page,
        perPage,
      } = args;
      const soType = RULE_SAVED_OBJECT_TYPE;
      const soIds = [ruleId];

      const findResult = await withSecuritySpan('findEventsBySavedObjectIds', () => {
        return eventLog.findEventsBySavedObjectIds(soType, soIds, {
          // TODO: include Framework events
          filter: buildEventLogKqlFilter({
            searchTerm,
            eventTypes,
            logLevels,
            dateStart,
            dateEnd,
          }),
          sort: [
            { sort_field: f.TIMESTAMP, sort_order: sortOrder },
            { sort_field: f.EVENT_SEQUENCE, sort_order: sortOrder },
          ],
          page,
          per_page: perPage,
        });
      });

      return {
        events: findResult.data.map((event) => normalizeEvent(event)),
        pagination: {
          page: findResult.page,
          per_page: findResult.per_page,
          total: findResult.total,
        },
      };
    },

    async getExecutionResults(
      args: GetExecutionResultsArgs
    ): Promise<GetRuleExecutionResultsResponse> {
      const {
        ruleId,
        start,
        end,
        statusFilters,
        page,
        perPage,
        sortField,
        sortOrder,
        runTypeFilters,
      } = args;
      const soType = RULE_SAVED_OBJECT_TYPE;
      const soIds = [ruleId];

      let totalExecutions: number | undefined;
      let executionIdsFilter: string = '';

      // Similar workaround to the above for status filters
      // First fetch execution uuid's by run type filter if provided
      // Then use those ID's to filter by status if provided
      const MAX_RUN_TYPE_FILTERS = RUN_TYPE_FILTERS.length;
      const someRunTypeFiltersSelected =
        runTypeFilters.length > 0 && runTypeFilters.length < MAX_RUN_TYPE_FILTERS;
      if (someRunTypeFiltersSelected) {
        const ruleRunEventActions = runTypeFilters.map((runType) => {
          return {
            [RuleRunTypeEnum.standard]: 'execute',
            [RuleRunTypeEnum.backfill]: 'execute-backfill',
          }[runType];
        });

        const { executionIds, total } = await findRuleExecutionIds({
          eventLog,
          soType,
          soIds,
          start,
          end,
          filter: `event.provider:alerting AND (${ruleRunEventActions
            .map((runType) => `event.action:${runType}`)
            .join(' OR ')}) `,
        });

        if (executionIds.length === 0) {
          return {
            total: 0,
            events: [],
          };
        } else {
          totalExecutions = total;
          executionIdsFilter = `${f.RULE_EXECUTION_UUID}:(${executionIds.join(' OR ')})`;
        }
      }

      // Current workaround to support root level filters without missing fields in the aggregate event
      // or including events from statuses that aren't selected
      // TODO: See: https://github.com/elastic/kibana/pull/127339/files#r825240516
      // First fetch execution uuid's by status filter if provided
      // If 0 or 3 statuses are selected we can search for all statuses and don't need this pre-filter by ID
      const MAX_STATUSES_FILTERS = STATUS_FILTERS.length;
      const someStatusFiltersSelected =
        statusFilters.length > 0 && statusFilters.length < MAX_STATUSES_FILTERS;
      if (someStatusFiltersSelected) {
        const outcomes = mapRuleExecutionStatusToPlatformStatus(statusFilters);
        const outcomeFilter = outcomes.length ? `OR event.outcome:(${outcomes.join(' OR ')})` : '';
        const { executionIds, total } = await findRuleExecutionIds({
          eventLog,
          soType,
          soIds,
          start,
          end,
          filter: `(${f.RULE_EXECUTION_STATUS}:(${statusFilters.join(' OR ')}) ${outcomeFilter}) ${
            executionIdsFilter ? `AND ${executionIdsFilter}` : ''
          }`,
        });

        // Early return if no results based on status filter
        if (executionIds.length === 0) {
          return {
            total: 0,
            events: [],
          };
        } else {
          executionIdsFilter = `${f.RULE_EXECUTION_UUID}:(${executionIds.join(' OR ')})`;
          totalExecutions = total;
        }
      }

      // Now query for aggregate events, and pass any ID's as filters as determined from the above status/queryText results
      const results = await eventLog.aggregateEventsBySavedObjectIds(soType, soIds, {
        start,
        end,
        filter: executionIdsFilter,
        aggs: getExecutionEventAggregation({
          maxExecutions: MAX_EXECUTION_EVENTS_DISPLAYED,
          page,
          perPage,
          sort: [{ [sortField]: { order: sortOrder } }],
          runTypeFilters,
        }),
      });

      return formatExecutionEventResponse(results, totalExecutions);
    },
  };
};

const normalizeEvent = (rawEvent: IValidatedEvent): RuleExecutionEvent => {
  invariant(rawEvent, 'Event not found');

  const timestamp = normalizeEventTimestamp(rawEvent);
  const sequence = normalizeEventSequence(rawEvent);
  const level = normalizeLogLevel(rawEvent);
  const type = normalizeEventType(rawEvent);
  const executionId = normalizeExecutionId(rawEvent);
  const message = rawEvent.message || '';
  const details = normalizeEventDetails(rawEvent, type);

  return { timestamp, sequence, level, type, message, details, execution_id: executionId };
};

type RawEvent = NonNullable<IValidatedEvent>;

const normalizeEventTimestamp = (event: RawEvent): string => {
  invariant(event['@timestamp'], 'Required "@timestamp" field is not found');
  return event['@timestamp'];
};

const normalizeEventSequence = (event: RawEvent): number => {
  const value = event.event?.sequence;
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  return 0;
};

const normalizeLogLevel = (event: RawEvent): LogLevel => {
  const value = event.log?.level;
  if (!value) {
    return LogLevelEnum.debug;
  }

  const result = LogLevel.safeParse(value);
  return result.success ? result.data : LogLevelEnum.trace;
};

const normalizeEventType = (event: RawEvent): RuleExecutionEventType => {
  const value = event.event?.action;
  invariant(value, 'Required "event.action" field is not found');

  const result = RuleExecutionEventType.safeParse(value);
  return result.success ? result.data : RuleExecutionEventTypeEnum.message;
};

const normalizeEventDetails = (
  event: RawEvent,
  type: RuleExecutionEventType
): Record<string, unknown> | undefined => {
  if (type === RuleExecutionEventTypeEnum['status-change']) {
    invariant(
      event.kibana?.alert?.rule?.execution?.status,
      'Required "kibana.alert.rule.execution.status" field is not found'
    );
    return { status: event.kibana.alert.rule.execution.status };
  }

  if (type === RuleExecutionEventTypeEnum['execution-metrics']) {
    invariant(
      event.kibana?.alert?.rule?.execution?.metrics,
      'Required "kibana.alert.rule.execution.metrics" field is not found'
    );
    return { metrics: event.kibana.alert.rule.execution.metrics };
  }
};

const normalizeExecutionId = (event: RawEvent): string => {
  invariant(
    event.kibana?.alert?.rule?.execution?.uuid,
    'Required "kibana.alert.rule.execution.uuid" field is not found'
  );

  return event.kibana.alert.rule.execution.uuid;
};

const buildEventLogKqlFilter = ({
  searchTerm,
  eventTypes,
  logLevels,
  dateStart,
  dateEnd,
}: Pick<
  GetExecutionEventsArgs,
  'searchTerm' | 'eventTypes' | 'logLevels' | 'dateStart' | 'dateEnd'
>) => {
  const filters = [`${f.EVENT_PROVIDER}:${RULE_EXECUTION_LOG_PROVIDER}`];

  if (searchTerm?.length) {
    filters.push(`${f.MESSAGE}:${prepareKQLStringParam(searchTerm)}`);
  }

  if (eventTypes?.length) {
    filters.push(`${f.EVENT_ACTION}:(${kqlOr(eventTypes)})`);
  }

  if (logLevels?.length) {
    filters.push(`${f.LOG_LEVEL}:(${kqlOr(logLevels)})`);
  }

  const dateRangeFilter: string[] = [];

  if (dateStart) {
    dateRangeFilter.push(`${f.TIMESTAMP} >= ${prepareKQLStringParam(dateStart)}`);
  }

  if (dateEnd) {
    dateRangeFilter.push(`${f.TIMESTAMP} <= ${prepareKQLStringParam(dateEnd)}`);
  }

  if (dateRangeFilter.length) {
    filters.push(kqlAnd(dateRangeFilter));
  }

  return kqlAnd(filters);
};

const findRuleExecutionIds = async ({
  eventLog,
  soType,
  soIds,
  start,
  end,
  filter,
}: {
  eventLog: IEventLogClient;
  soType: string;
  soIds: string[];
  start: string;
  end: string;
  filter: string;
}) => {
  const runTypesResponse = await eventLog.aggregateEventsBySavedObjectIds(soType, soIds, {
    start,
    end,
    filter,
    aggs: {
      totalExecutions: {
        cardinality: {
          field: f.RULE_EXECUTION_UUID,
        },
      },
      filteredExecutionUUIDs: {
        terms: {
          field: f.RULE_EXECUTION_UUID,
          order: { executeStartTime: 'desc' },
          size: MAX_EXECUTION_EVENTS_DISPLAYED,
        },
        aggs: {
          executeStartTime: {
            min: {
              field: f.TIMESTAMP,
            },
          },
        },
      },
    },
  });

  const total =
    (runTypesResponse.aggregations?.totalExecutions as estypes.AggregationsCardinalityAggregate)
      ?.value ?? 0;
  const filteredExecutionUUIDs = runTypesResponse.aggregations
    ?.filteredExecutionUUIDs as ExecutionUuidAggResult;
  const executionIds = filteredExecutionUUIDs?.buckets?.map((b) => b.key) ?? [];

  return {
    executionIds,
    total,
  };
};
