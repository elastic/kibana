/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { markHuntFindingDeployed, HuntFindingNotFoundError } from './mark_hunt_finding_deployed';

describe('markHuntFindingDeployed', () => {
  const esClient = {
    search: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns deployed fields after updating a visible finding', async () => {
    esClient.search.mockResolvedValue({
      hits: { hits: [{ _id: 'finding-1' }] },
    });
    esClient.update.mockResolvedValue({});

    const result = await markHuntFindingDeployed(esClient as never, {
      spaceId: 'default',
      findingId: 'finding-1',
      ruleId: 'rule-1',
      deployedAt: '2026-07-22T16:00:00.000Z',
    });

    expect(result).toEqual({
      finding_id: 'finding-1',
      status: 'deployed',
      deployed_rule_id: 'rule-1',
      deployed_at: '2026-07-22T16:00:00.000Z',
    });
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'finding-1',
        doc: {
          status: 'deployed',
          deployed_rule_id: 'rule-1',
          deployed_at: '2026-07-22T16:00:00.000Z',
        },
      })
    );
  });

  it('throws HuntFindingNotFoundError when the finding is not visible in space', async () => {
    esClient.search.mockResolvedValue({ hits: { hits: [] } });

    await expect(
      markHuntFindingDeployed(esClient as never, {
        spaceId: 'default',
        findingId: 'missing',
        ruleId: 'rule-1',
      })
    ).rejects.toBeInstanceOf(HuntFindingNotFoundError);
    expect(esClient.update).not.toHaveBeenCalled();
  });
});
