/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { IndicatorReader } from '../knowledge_indicators/knowledge_indicator_client/indicator_reader';
import { RuleEventsClient } from '../significant_events/events/rule_events_client';
import { getDetectionSnapshotKnowledgeCounts } from './detection_snapshot_contributor';

const setup = (ruleIds: string[]) => {
  jest
    .spyOn(IndicatorReader.prototype, 'countKnowledgeIndicators')
    .mockImplementation(async (type) => (type === 'feature' ? 10 : 6));
  jest
    .spyOn(IndicatorReader.prototype, 'getRuleBackedQueryLinks')
    .mockResolvedValue(
      ruleIds.map((ruleId) => ({ rule_id: ruleId })) as Awaited<
        ReturnType<IndicatorReader['getRuleBackedQueryLinks']>
      >
    );
  jest.spyOn(RuleEventsClient.prototype, 'countFacets').mockResolvedValue({
    severity: { critical: 0, high: 0, medium: 0, low: 0 },
    status: { active: 2, recovering: 1, inactive: 4 },
  });
  const findRules = jest.fn(async ({ filter }: { filter?: string }) => ({
    items: [],
    total: (filter?.match(/id: "/g) ?? []).length,
    page: 1,
    per_page: 1,
  }));
  const run = () =>
    getDetectionSnapshotKnowledgeCounts({
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      rulesClient: { findRules },
      space: 'default',
      logger: loggingSystemMock.createLogger(),
    });
  return { findRules, run };
};

describe('getDetectionSnapshotKnowledgeCounts', () => {
  afterEach(() => jest.restoreAllMocks());

  it('counts knowledge indicators, distinct rules and events by current status', async () => {
    const { findRules, run } = setup(['rule-1', 'rule-2', 'rule-1', '']);

    await expect(run()).resolves.toEqual({
      knowledge_indicators_features: 10,
      knowledge_indicators_queries: 6,
      significant_event_rules: 2,
      significant_event_rules_active: 2,
      significant_events_total: 7,
      significant_events_open: 3,
    });
    expect(findRules).toHaveBeenCalledWith({
      filter: 'enabled: true and (id: "rule-1" or id: "rule-2")',
      perPage: 1,
    });
  });

  it('reads enabled rules 500 ids at a time', async () => {
    const { findRules, run } = setup(Array.from({ length: 501 }, (_, index) => `rule-${index}`));

    await expect(run()).resolves.toMatchObject({
      significant_event_rules: 501,
      significant_event_rules_active: 501,
    });
    expect(findRules).toHaveBeenCalledTimes(2);
  });
});
