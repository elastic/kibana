/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicatorClient } from '../knowledge_indicators';
import { collectResetSnapshot } from './reset_snapshot';

const createClient = () =>
  ({
    getStreamNamesWithKnowledgeIndicators: jest.fn().mockResolvedValue(['logs.web']),
    findStreamNamesWithOwnedRules: jest.fn().mockResolvedValue(['logs.web', 'logs.orphan']),
    getStreamToQueryLinksMap: jest.fn().mockResolvedValue({
      'logs.web': [{ rule_backed: true, rule_id: 'linked-rule' }, { rule_backed: false }],
      'logs.orphan': [],
    }),
    getFeatures: jest.fn().mockResolvedValue({
      hits: [{ id: 'feature-1' }, { id: 'feature-2' }],
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
    expect(client.getStreamToQueryLinksMap).toHaveBeenCalledWith(['logs.web', 'logs.orphan'], {
      includeExpired: true,
    });
    expect(client.getStreamToQueryLinksMap).toHaveBeenCalledTimes(1);
    expect(client.getFeatures).toHaveBeenCalledWith(['logs.web', 'logs.orphan'], {
      includeExcluded: true,
      includeExpired: true,
    });
    expect(client.getFeatures).toHaveBeenCalledTimes(1);
    expect(failures).toEqual([]);
  });

  it('still discovers tag-owned orphan rules when the KI stream lookup fails', async () => {
    const client = createClient();
    client.getStreamNamesWithKnowledgeIndicators.mockRejectedValueOnce(
      new Error('knowledge indicator stream missing')
    );
    client.getStreamToQueryLinksMap.mockRejectedValue(new Error('query stream missing'));
    client.getFeatures.mockRejectedValue(new Error('feature stream missing'));
    const failures: Array<{ target: string; error: string }> = [];

    await expect(collectResetSnapshot(client, failures)).resolves.toEqual({
      knowledgeIndicators: 0,
      storedQueries: 0,
      ruleIds: ['linked-rule', 'owned-rule', 'orphan-rule'],
    });
    expect(client.findOwnedRuleIds).toHaveBeenCalledTimes(2);
    expect(failures).toContainEqual({
      target: 'snapshot:knowledge-indicators',
      error: 'knowledge indicator stream missing',
    });
    expect(failures).toContainEqual({
      target: 'snapshot:queries',
      error: 'query stream missing',
    });
  });
});
