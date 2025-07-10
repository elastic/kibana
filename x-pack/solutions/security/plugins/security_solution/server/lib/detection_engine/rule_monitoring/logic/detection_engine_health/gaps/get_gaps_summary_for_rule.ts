/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';

interface GetGapsSummaryForRuleParams {
  rulesClient: RulesClientApi;
  ruleId: string;
  interval: {
    from: IsoDateString;
    to: IsoDateString;
  };
}

export interface GapSummary {
  total_unfilled_duration_ms: number;
  total_in_progress_duration_ms: number;
  total_filled_duration_ms: number;
}

export const getGapsSummaryForRule = async ({
  rulesClient,
  ruleId,
  interval,
}: GetGapsSummaryForRuleParams): Promise<GapSummary> => {
  const result = await rulesClient.getGapsSummaryByRuleIds({
    ruleIds: [ruleId],
    start: interval.from,
    end: interval.to,
  });

  let gapsSummary = {
    total_unfilled_duration_ms: 0,
    total_in_progress_duration_ms: 0,
    total_filled_duration_ms: 0,
  };

  if (result.data.length === 1) {
    const { totalFilledDurationMs, totalInProgressDurationMs, totalUnfilledDurationMs } =
      result.data[0];
    gapsSummary = {
      total_unfilled_duration_ms: totalUnfilledDurationMs,
      total_in_progress_duration_ms: totalInProgressDurationMs,
      total_filled_duration_ms: totalFilledDurationMs,
    };
  }

  return gapsSummary;
};
