/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindSLO } from './find_slo';
import type { SummarySearchClient } from './summary_search_client/types';

describe('FindSLO metadata filtering', () => {
  let mockSearchClient: jest.Mocked<SummarySearchClient>;
  let mockRepository: any;

  beforeEach(() => {
    mockSearchClient = {
      search: jest.fn().mockResolvedValue({
        total: 0,
        page: 1,
        perPage: 25,
        results: [],
      }),
    };
    mockRepository = {
      findAllByIds: jest.fn().mockResolvedValue([]),
    };
  });

  it('passes metadata filters to the search client', async () => {
    const findSLO = new FindSLO(mockRepository, mockSearchClient);

    await findSLO.execute({
      metadata: 'team:platform,env:production',
    });

    expect(mockSearchClient.search).toHaveBeenCalledWith(
      '',
      '',
      { field: 'status', direction: 'asc' },
      { page: 1, perPage: 25 },
      undefined,
      [
        { term: { 'slo.metadata.team': 'platform' } },
        { term: { 'slo.metadata.env': 'production' } },
      ]
    );
  });

  it('handles empty metadata filter', async () => {
    const findSLO = new FindSLO(mockRepository, mockSearchClient);

    await findSLO.execute({});

    expect(mockSearchClient.search).toHaveBeenCalledWith(
      '',
      '',
      { field: 'status', direction: 'asc' },
      { page: 1, perPage: 25 },
      undefined,
      []
    );
  });

  it('handles metadata with colons in values', async () => {
    const findSLO = new FindSLO(mockRepository, mockSearchClient);

    await findSLO.execute({
      metadata: 'url:https://example.com',
    });

    expect(mockSearchClient.search).toHaveBeenCalledWith(
      '',
      '',
      { field: 'status', direction: 'asc' },
      { page: 1, perPage: 25 },
      undefined,
      [{ term: { 'slo.metadata.url': 'https://example.com' } }]
    );
  });
});
