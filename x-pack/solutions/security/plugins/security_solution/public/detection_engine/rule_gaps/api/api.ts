/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INTERNAL_ALERTING_BACKFILL_API_PATH,
  INTERNAL_ALERTING_BACKFILL_FIND_API_PATH,
  INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH,
  INTERNAL_ALERTING_GAPS_GET_RULES_API_PATH,
  INTERNAL_ALERTING_GAPS_GET_SUMMARY_BY_RULE_IDS_API_PATH,
  INTERNAL_ALERTING_GAPS_FILL_BY_ID_API_PATH,
  INTERNAL_ALERTING_GAPS_FIND_API_PATH,
  gapStatus,
} from '@kbn/alerting-plugin/common';
import type { FindBackfillResponseBody } from '@kbn/alerting-plugin/common/routes/backfill/apis/find';
import type { ScheduleBackfillResponseBody } from '@kbn/alerting-plugin/common/routes/backfill/apis/schedule';
import type { GetGapsSummaryByRuleIdsResponseBody } from '@kbn/alerting-plugin/common/routes/gaps/apis/get_gaps_summary_by_rule_ids';
import type { GetRuleIdsWithGapResponseBody } from '@kbn/alerting-plugin/common/routes/gaps/apis/get_rules_with_gaps';
import type { FindGapsResponseBody } from '@kbn/alerting-plugin/common/routes/gaps/apis/find';
import type { FillGapByIdResponseV1 } from '@kbn/alerting-plugin/common/routes/gaps/apis/fill';
import dateMath from '@kbn/datemath';
import { KibanaServices } from '../../../common/lib/kibana';
import type { GapStatus, ScheduleBackfillProps } from '../types';

/**
 * Schedule rules run over a specified time range
 *
 * @param ruleIds `rule_id`s of each rule to be backfilled
 * @param timeRange the time range over which the backfill should apply
 *
 * @throws An error if response is not OK
 */
export const scheduleRuleRun = async ({
  ruleIds,
  timeRange,
}: ScheduleBackfillProps): Promise<ScheduleBackfillResponseBody> => {
  const params = ruleIds.map((ruleId) => {
    return {
      rule_id: ruleId,
      start: timeRange.startDate.toISOString(),
      end: timeRange.endDate.toISOString(),
    };
  });
  return KibanaServices.get().http.fetch<ScheduleBackfillResponseBody>(
    INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH,
    {
      method: 'POST',
      version: '2023-10-31',
      body: JSON.stringify(params),
    }
  );
};

/**
 * Find backfills for the given rule IDs
 * @param ruleIds string[]
 * @param signal? AbortSignal
 * @returns
 */
export const findBackfillsForRules = async ({
  ruleIds,
  page,
  perPage,
  signal,
  sortField = 'createdAt',
  sortOrder = 'desc',
}: {
  ruleIds: string[];
  page: number;
  perPage: number;
  signal?: AbortSignal;
  sortField?: string;
  sortOrder?: string;
}): Promise<FindBackfillResponseBody> =>
  KibanaServices.get().http.fetch<FindBackfillResponseBody>(
    INTERNAL_ALERTING_BACKFILL_FIND_API_PATH,
    {
      method: 'POST',
      query: {
        rule_ids: ruleIds.join(','),
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
      },
      signal,
    }
  );

/**
 * Delete backfill by ID
 * @param backfillId
 * @returns
 */
export const deleteBackfill = async ({ backfillId }: { backfillId: string }) => {
  return KibanaServices.get().http.fetch<FindBackfillResponseBody>(
    `${INTERNAL_ALERTING_BACKFILL_API_PATH}/${backfillId}`,
    {
      method: 'DELETE',
    }
  );
};

/**
 * Find rules with gaps
 * @param ruleIds string[]
 * @param signal? AbortSignal
 * @returns
 */
export const getRuleIdsWithGaps = async ({
  signal,
  start,
  end,
  statuses = [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
}: {
  start: string;
  end: string;
  statuses: string[];
  signal?: AbortSignal;
}): Promise<GetRuleIdsWithGapResponseBody> =>
  KibanaServices.get().http.fetch<GetRuleIdsWithGapResponseBody>(
    INTERNAL_ALERTING_GAPS_GET_RULES_API_PATH,
    {
      method: 'POST',
      body: JSON.stringify({
        start,
        end,
        statuses,
      }),
      signal,
    }
  );

/**
 * Find total gap info for the given rule IDs
 * @param ruleIds string[]
 * @param signal? AbortSignal
 * @returns
 */
export const getGapsSummaryByRuleIds = async ({
  signal,
  start,
  end,
  ruleIds,
}: {
  start: string;
  end: string;
  ruleIds: string[];
  signal?: AbortSignal;
}): Promise<GetGapsSummaryByRuleIdsResponseBody> =>
  KibanaServices.get().http.fetch<GetGapsSummaryByRuleIdsResponseBody>(
    INTERNAL_ALERTING_GAPS_GET_SUMMARY_BY_RULE_IDS_API_PATH,
    {
      signal,
      method: 'POST',
      body: JSON.stringify({
        start,
        end,
        rule_ids: ruleIds,
      }),
    }
  );

/**
 * Find gaps for the given rule ID
 * @param ruleIds string[]
 * @param signal? AbortSignal
 * @returns
 */
export const findGapsForRule = async ({
  ruleId,
  page,
  perPage,
  signal,
  sortField = '@timestamp',
  sortOrder = 'desc',
  start,
  end,
  statuses,
}: {
  ruleId: string;
  page: number;
  perPage: number;
  start: string;
  end: string;
  statuses: GapStatus[];
  signal?: AbortSignal;
  sortField?: string;
  sortOrder?: string;
}): Promise<FindGapsResponseBody> => {
  const startDate = dateMath.parse(start);
  const endDate = dateMath.parse(end, { roundUp: true });

  return KibanaServices.get().http.fetch<FindGapsResponseBody>(
    INTERNAL_ALERTING_GAPS_FIND_API_PATH,
    {
      method: 'POST',
      body: JSON.stringify({
        rule_id: ruleId,
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
        start: startDate?.utc().toISOString(),
        end: endDate?.utc().toISOString(),
        statuses,
      }),
      signal,
    }
  );
};

/**
 * Fill gap by Id for the given rule ID
 * @param ruleIds string[]
 * @param signal? AbortSignal
 * @returns
 */
export const fillGapByIdForRule = async ({
  ruleId,
  gapId,
  signal,
}: {
  ruleId: string;
  gapId: string;
  signal?: AbortSignal;
}): Promise<FillGapByIdResponseV1> =>
  KibanaServices.get().http.fetch<FillGapByIdResponseV1>(
    INTERNAL_ALERTING_GAPS_FILL_BY_ID_API_PATH,
    {
      method: 'POST',
      query: {
        rule_id: ruleId,
        gap_id: gapId,
      },
      signal,
    }
  );
