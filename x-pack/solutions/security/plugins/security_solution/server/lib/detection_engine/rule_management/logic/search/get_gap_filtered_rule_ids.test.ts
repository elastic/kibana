/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { gapFillStatus } from '@kbn/alerting-plugin/common';
import {
  getRuleMock,
  getFindResultWithMultiHits,
} from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import { getGapFilteredRuleIds } from './get_gap_filtered_rule_ids';

describe('getGapFilteredRuleIds', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  const defaultGapRange = {
    start: '2025-01-01T00:00:00.000Z',
    end: '2025-01-02T00:00:00.000Z',
  };

  const defaultGapFillStatuses = [gapFillStatus.UNFILLED];

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    jest.resetAllMocks();
  });

  describe('when no rules have gaps', () => {
    it('should return empty array and truncated=false', async () => {
      rulesClient.getRuleIdsWithGaps.mockResolvedValue({
        total: 0,
        ruleIds: [],
      });

      const result = await getGapFilteredRuleIds({
        rulesClient,
        gapRange: defaultGapRange,
        gapFillStatuses: defaultGapFillStatuses,
        maxRuleIds: 10,
      });

      expect(result).toEqual({
        ruleIds: [],
        truncated: false,
      });
      expect(rulesClient.getRuleIdsWithGaps).toHaveBeenCalledTimes(1);
    });
  });

  describe('when rules with gaps are under the limit', () => {
    it('should return all rule IDs and truncated=false when no filter is provided', async () => {
      const ruleIds = ['rule-1', 'rule-2', 'rule-3'];
      rulesClient.getRuleIdsWithGaps.mockResolvedValue({
        total: 3,
        ruleIds,
        latestGapTimestamp: 1,
      });

      const result = await getGapFilteredRuleIds({
        rulesClient,
        gapRange: defaultGapRange,
        gapFillStatuses: defaultGapFillStatuses,
        maxRuleIds: 10,
      });

      expect(result).toEqual({
        ruleIds,
        truncated: false,
      });
      expect(rulesClient.getRuleIdsWithGaps).toHaveBeenCalledTimes(1);
    });

    it('should return all rule IDs and truncated=false when filter is provided but gaps are under maxRuleIds', async () => {
      const ruleIds = ['rule-1', 'rule-2'];
      rulesClient.getRuleIdsWithGaps.mockResolvedValue({
        total: 2,
        ruleIds,
        latestGapTimestamp: 1,
      });

      const result = await getGapFilteredRuleIds({
        rulesClient,
        gapRange: defaultGapRange,
        gapFillStatuses: defaultGapFillStatuses,
        maxRuleIds: 10,
        filter: 'alert.attributes.name: test',
      });

      expect(result).toEqual({
        ruleIds,
        truncated: false,
      });
      expect(rulesClient.getRuleIdsWithGaps).toHaveBeenCalledTimes(1);
    });
  });

  describe('when rules with gaps exceed the limit', () => {
    it('should slice results to maxRuleIds when no filter is provided', async () => {
      const allRuleIds = Array.from({ length: 11 }, (_, i) => `rule-${i}`);
      rulesClient.getRuleIdsWithGaps.mockResolvedValue({
        total: 11,
        ruleIds: allRuleIds,
        latestGapTimestamp: 1,
      });

      const result = await getGapFilteredRuleIds({
        rulesClient,
        gapRange: defaultGapRange,
        gapFillStatuses: defaultGapFillStatuses,
        maxRuleIds: 10,
      });

      // Should return first 10 rule IDs
      expect(result.ruleIds).toHaveLength(10);
      expect(result.ruleIds).toEqual(allRuleIds.slice(0, 10));
      expect(result.truncated).toBe(true);
    });
  });

  describe('when filter is provided and many rules have gaps', () => {
    it('should collect candidate rule IDs and re-query gaps, returning truncated=true when candidate rules exceed maxRuleIds', async () => {
      // Initial query returns maxRuleIds + 1 (11) rules to indicate truncation
      rulesClient.getRuleIdsWithGaps
        .mockResolvedValueOnce({
          total: 11,
          ruleIds: Array.from({ length: 11 }, (_, i) => `gap-rule-${i}`),
          latestGapTimestamp: 1,
        })
        .mockResolvedValueOnce({
          total: 5,
          ruleIds: ['rule-1', 'rule-3', 'rule-5', 'rule-7', 'rule-9'],
          latestGapTimestamp: 1,
        });

      const mockRules = Array.from({ length: 10 }, (_, i) => {
        const rule = getRuleMock(getQueryRuleParams());
        rule.id = `rule-${i}`;
        return rule;
      });

      rulesClient.find.mockResolvedValue(
        getFindResultWithMultiHits({
          data: mockRules,
          perPage: 250,
          page: 1,
          total: 11,
        })
      );

      const result = await getGapFilteredRuleIds({
        rulesClient,
        gapRange: defaultGapRange,
        gapFillStatuses: defaultGapFillStatuses,
        maxRuleIds: 10,
        filter: 'alert.attributes.name: test',
      });

      expect(result.ruleIds).toEqual(['rule-1', 'rule-3', 'rule-5', 'rule-7', 'rule-9']);
      expect(result.truncated).toBe(true);
      expect(rulesClient.getRuleIdsWithGaps).toHaveBeenCalledTimes(2);
      expect(rulesClient.find).toHaveBeenCalled();
    });

    it('should return truncated=false when candidate rules are fewer than maxRuleIds', async () => {
      rulesClient.getRuleIdsWithGaps
        .mockResolvedValueOnce({
          total: 11,
          ruleIds: Array.from({ length: 11 }, (_, i) => `gap-rule-${i}`),
          latestGapTimestamp: 1,
        })
        .mockResolvedValueOnce({
          total: 3,
          ruleIds: ['rule-1', 'rule-2', 'rule-3'],
          latestGapTimestamp: 1,
        });

      const mockRules = Array.from({ length: 5 }, (_, i) => {
        const rule = getRuleMock(getQueryRuleParams());
        rule.id = `rule-${i}`;
        return rule;
      });

      rulesClient.find.mockResolvedValue(
        getFindResultWithMultiHits({
          data: mockRules,
          perPage: 250,
          page: 1,
          total: 5,
        })
      );

      const result = await getGapFilteredRuleIds({
        rulesClient,
        gapRange: defaultGapRange,
        gapFillStatuses: defaultGapFillStatuses,
        maxRuleIds: 10,
        filter: 'alert.attributes.name: test',
      });

      expect(result.ruleIds).toEqual(['rule-1', 'rule-2', 'rule-3']);
      expect(result.truncated).toBe(false);
    });

    it('should return empty array when no candidate rules match the filter', async () => {
      rulesClient.getRuleIdsWithGaps.mockResolvedValue({
        total: 11,
        ruleIds: Array.from({ length: 11 }, (_, i) => `gap-rule-${i}`),
        latestGapTimestamp: 1,
      });

      rulesClient.find.mockResolvedValue(
        getFindResultWithMultiHits({
          data: [],
          perPage: 250,
          page: 1,
          total: 0,
        })
      );

      const result = await getGapFilteredRuleIds({
        rulesClient,
        gapRange: defaultGapRange,
        gapFillStatuses: defaultGapFillStatuses,
        maxRuleIds: 10,
        filter: 'alert.attributes.name: nonexistent',
      });

      expect(result).toEqual({
        ruleIds: [],
        truncated: false,
      });
      expect(rulesClient.getRuleIdsWithGaps).toHaveBeenCalledTimes(1);
    });

    it('should paginate through multiple pages when collecting candidate rule IDs', async () => {
      rulesClient.getRuleIdsWithGaps
        .mockResolvedValueOnce({
          total: 301,
          ruleIds: Array.from({ length: 301 }, (_, i) => `gap-rule-${i}`),
          latestGapTimestamp: 1,
        })
        .mockResolvedValueOnce({
          total: 280,
          ruleIds: Array.from({ length: 280 }, (_, i) => `rule-${i}`),
          latestGapTimestamp: 1,
        });

      const page1Rules = Array.from({ length: 250 }, (_, i) => {
        const rule = getRuleMock(getQueryRuleParams());
        rule.id = `rule-${i}`;
        return rule;
      });
      const page2Rules = Array.from({ length: 50 }, (_, i) => {
        const rule = getRuleMock(getQueryRuleParams());
        rule.id = `rule-${250 + i}`;
        return rule;
      });

      rulesClient.find
        .mockResolvedValueOnce(
          getFindResultWithMultiHits({ data: page1Rules, perPage: 250, page: 1, total: 300 })
        )
        .mockResolvedValueOnce(
          getFindResultWithMultiHits({ data: page2Rules, perPage: 250, page: 2, total: 300 })
        );

      const result = await getGapFilteredRuleIds({
        rulesClient,
        gapRange: defaultGapRange,
        gapFillStatuses: defaultGapFillStatuses,
        maxRuleIds: 300,
        filter: 'alert.attributes.name: test',
      });

      // Verify pagination occurred - should have fetched 2 pages
      expect(rulesClient.find).toHaveBeenCalledTimes(2);
      expect(rulesClient.find).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ options: expect.objectContaining({ page: 1, perPage: 250 }) })
      );
      expect(rulesClient.find).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ options: expect.objectContaining({ page: 2, perPage: 250 }) })
      );

      expect(result.ruleIds).toHaveLength(280);
      expect(result.truncated).toBe(false);
    });

    it('should stop pagination early when maxRuleIds is reached', async () => {
      rulesClient.getRuleIdsWithGaps
        .mockResolvedValueOnce({
          total: 501,
          ruleIds: Array.from({ length: 501 }, (_, i) => `rule-${i}`),
          latestGapTimestamp: 1,
        })
        .mockResolvedValueOnce({
          total: 100,
          ruleIds: Array.from({ length: 100 }, (_, i) => `rule-${i}`),
          latestGapTimestamp: 1,
        });

      const page1Rules = Array.from({ length: 250 }, (_, i) => {
        const rule = getRuleMock(getQueryRuleParams());
        rule.id = `rule-${i}`;
        return rule;
      });

      rulesClient.find.mockResolvedValue(
        getFindResultWithMultiHits({ data: page1Rules, perPage: 250, page: 1, total: 500 })
      );

      const result = await getGapFilteredRuleIds({
        rulesClient,
        gapRange: defaultGapRange,
        gapFillStatuses: defaultGapFillStatuses,
        maxRuleIds: 200,
        filter: 'alert.attributes.name: test',
      });

      expect(rulesClient.find).toHaveBeenCalledTimes(1);
      expect(result.truncated).toBe(true);
    });
  });

  describe('parameter passing', () => {
    it('should pass correct parameters to getRuleIdsWithGaps', async () => {
      rulesClient.getRuleIdsWithGaps.mockResolvedValue({
        total: 0,
        ruleIds: [],
      });

      await getGapFilteredRuleIds({
        rulesClient,
        gapRange: defaultGapRange,
        gapFillStatuses: [gapFillStatus.UNFILLED, gapFillStatus.IN_PROGRESS],
        maxRuleIds: 10,
      });

      expect(rulesClient.getRuleIdsWithGaps).toHaveBeenCalledWith(
        expect.objectContaining({
          highestPriorityGapFillStatuses: [gapFillStatus.UNFILLED, gapFillStatus.IN_PROGRESS],
          start: defaultGapRange.start,
          end: defaultGapRange.end,
        })
      );
    });

    it('should pass ruleIds to second getRuleIdsWithGaps call when narrowing', async () => {
      rulesClient.getRuleIdsWithGaps
        .mockResolvedValueOnce({
          total: 11,
          ruleIds: Array.from({ length: 11 }, (_, i) => `gap-rule-${i}`),
          latestGapTimestamp: 1,
        })
        .mockResolvedValueOnce({
          total: 2,
          ruleIds: ['rule-1', 'rule-2'],
          latestGapTimestamp: 1,
        });

      const mockRules = Array.from({ length: 10 }, (_, i) => {
        const rule = getRuleMock(getQueryRuleParams());
        rule.id = `rule-${i}`;
        return rule;
      });

      rulesClient.find.mockResolvedValue(
        getFindResultWithMultiHits({
          data: mockRules,
          perPage: 250,
          page: 1,
          total: 10,
        })
      );

      await getGapFilteredRuleIds({
        rulesClient,
        gapRange: defaultGapRange,
        gapFillStatuses: defaultGapFillStatuses,
        maxRuleIds: 10,
        filter: 'alert.attributes.name: test',
      });

      expect(rulesClient.getRuleIdsWithGaps).toHaveBeenNthCalledWith(2, {
        highestPriorityGapFillStatuses: defaultGapFillStatuses,
        start: defaultGapRange.start,
        end: defaultGapRange.end,
        ruleIds: expect.arrayContaining(['rule-0', 'rule-1']),
      });
    });
  });
});
