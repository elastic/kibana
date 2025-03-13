/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server/rules_client';
import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';
import { getGapsSummaryForRule } from './get_gaps_summary_for_rule';

describe('getGapsSummaryForRule', () => {
  let rulesClient: RulesClient;
  let ruleId: string;
  let interval: {
    from: IsoDateString;
    to: IsoDateString;
  };

  beforeEach(() => {
    rulesClient = {
      getGapsSummaryByRuleIds: jest.fn().mockResolvedValue({ data: [] }),
    } as unknown as RulesClient;
    ruleId = 'rule-1';
    interval = {
      from: '2023-10-31T00:00:00.000Z',
      to: '2023-10-31T23:59:59.999Z',
    };
  });

  it('should call getGapsSummaryByRuleIds with ruleId and interval', async () => {
    await getGapsSummaryForRule({ rulesClient, ruleId, interval });
    expect(rulesClient.getGapsSummaryByRuleIds).toHaveBeenCalledWith({
      ruleIds: [ruleId],
      start: interval.from,
      end: interval.to,
    });
  });

  it('should return gaps summary for rule', async () => {
    rulesClient.getGapsSummaryByRuleIds = jest.fn().mockResolvedValue({
      data: [
        {
          ruleId,
          totalUnfilledDurationMs: 100,
          totalInProgressDurationMs: 200,
          totalFilledDurationMs: 300,
        },
      ],
    });
    const result = await getGapsSummaryForRule({ rulesClient, ruleId, interval });

    expect(result).toEqual({
      total_unfilled_duration_ms: 100,
      total_in_progress_duration_ms: 200,
      total_filled_duration_ms: 300,
    });
  });

  it('should return default gaps summary for rule when no data is returned', async () => {
    const result = await getGapsSummaryForRule({ rulesClient, ruleId, interval });

    expect(result).toEqual({
      total_unfilled_duration_ms: 0,
      total_in_progress_duration_ms: 0,
      total_filled_duration_ms: 0,
    });
  });
});
