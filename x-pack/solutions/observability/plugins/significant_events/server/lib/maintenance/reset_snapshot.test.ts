/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicatorClient } from '../knowledge_indicators';
import { KI_TYPE_FEATURE, KI_TYPE_QUERY } from '../knowledge_indicators';
import { collectResetSnapshot } from './reset_snapshot';

const createClient = () =>
  ({
    getSourceIdsWithKnowledgeIndicators: jest.fn().mockResolvedValue(['logs.web']),
    findSourceIdsWithOwnedRules: jest.fn().mockResolvedValue(['logs.web', 'logs.orphan']),
    countKnowledgeIndicators: jest.fn().mockResolvedValue(2),
    getSourceToQueryLinksMap: jest.fn().mockResolvedValue({
      'logs.web': [{ rule_backed: true, rule_id: 'linked-rule' }, { rule_backed: false }],
      'logs.orphan': [],
    }),
    findOwnedRuleIds: jest.fn(async (streamName: string) =>
      streamName === 'logs.orphan' ? ['orphan-rule'] : ['linked-rule', 'owned-rule']
    ),
  } as unknown as jest.Mocked<KnowledgeIndicatorClient>);

describe('collectResetSnapshot', () => {
  it('counts all feature/query records and unions linked and tag-owned rule ids', async () => {
    const client = createClient();
    const failures: Array<{ target: string; error: string }> = [];

    await expect(collectResetSnapshot(client, failures)).resolves.toEqual({
      knowledgeIndicators: 2,
      storedQueries: 2,
      ruleIds: ['linked-rule', 'owned-rule', 'orphan-rule'],
    });
    expect(client.getSourceToQueryLinksMap).toHaveBeenCalledWith(['logs.web', 'logs.orphan'], {
      includeExpired: true,
    });
    expect(client.getSourceToQueryLinksMap).toHaveBeenCalledTimes(1);
    expect(client.countKnowledgeIndicators).toHaveBeenCalledWith(KI_TYPE_FEATURE);
    expect(client.countKnowledgeIndicators).toHaveBeenCalledWith(KI_TYPE_QUERY);
    expect(failures).toEqual([]);
  });

  it('still discovers tag-owned orphan rules when the KI stream lookup fails', async () => {
    const client = createClient();
    client.getSourceIdsWithKnowledgeIndicators.mockRejectedValueOnce(
      new Error('knowledge indicator stream missing')
    );
    client.getSourceToQueryLinksMap.mockRejectedValue(new Error('query stream missing'));
    client.countKnowledgeIndicators.mockImplementation(async (type) => {
      if (type === KI_TYPE_FEATURE) {
        throw new Error('feature count failed');
      }
      return 12_345;
    });
    const failures: Array<{ target: string; error: string }> = [];

    await expect(collectResetSnapshot(client, failures)).resolves.toEqual({
      knowledgeIndicators: 0,
      storedQueries: 12_345,
      ruleIds: ['linked-rule', 'owned-rule', 'orphan-rule'],
    });
    expect(client.findOwnedRuleIds).toHaveBeenCalledTimes(2);
    expect(failures).toContainEqual({
      target: 'snapshot:knowledge-indicators',
      error: 'knowledge indicator stream missing',
    });
    expect(failures).toContainEqual({
      target: 'snapshot:features',
      error: 'feature count failed',
    });
    expect(failures).toContainEqual({
      target: 'snapshot:queries',
      error: 'query stream missing',
    });
  });

  it('limits owned-rule lookups and preserves stream order', async () => {
    const streamNames = Array.from({ length: 25 }, (_, index) => `logs.${index}`);
    const client = createClient();
    client.getSourceIdsWithKnowledgeIndicators.mockResolvedValue(streamNames);
    client.findSourceIdsWithOwnedRules.mockResolvedValue([]);
    client.getSourceToQueryLinksMap.mockResolvedValue({});
    let active = 0;
    let maxActive = 0;
    client.findOwnedRuleIds.mockImplementation(async (streamName) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 0));
      active -= 1;
      return [`rule-${streamName}`];
    });

    const snapshot = await collectResetSnapshot(client, []);

    expect(maxActive).toBe(10);
    expect(snapshot.ruleIds).toEqual(streamNames.map((streamName) => `rule-${streamName}`));
  });
});
