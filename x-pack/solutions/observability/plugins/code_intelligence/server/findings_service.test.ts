/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { FINDING_TYPES } from '../common/finding_filters';
import { getFinding, searchFindings, updateFindingStatus } from './findings_service';

const setup = () => {
  const client = {
    search: jest.fn(async () => ({ hits: { total: { value: 0 }, hits: [] } })),
    get: jest.fn(async () => ({ found: false })),
    update: jest.fn(async () => ({})),
  };
  return { client, esClient: client as unknown as ElasticsearchClient };
};

const params = { repositories: [], statuses: [], signalTypes: [], page: 1, perPage: 10 };

const source = { status: 'open', evidence: [{ path: 'auth.ts', line: 10, excerpt: 'log(token)' }] };

describe('searchFindings', () => {
  it('always filters to supported finding types, ignores a missing index, and sorts newest first', async () => {
    const { client, esClient } = setup();

    expect(await searchFindings(esClient, 'findings', params)).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      items: [],
    });
    expect(client.search).toHaveBeenCalledWith({
      index: 'findings',
      ignore_unavailable: true,
      from: 0,
      size: 10,
      query: { bool: { filter: [{ terms: { finding_type: [...FINDING_TYPES] } }] } },
      sort: [{ updated_at: 'desc' }, '_doc'],
    });
  });

  it('adds repository, status, signal, and text filters with relevance sorting only for q', async () => {
    const { client, esClient } = setup();

    await searchFindings(esClient, 'findings', {
      ...params,
      repositories: ['owner/repo'],
      statuses: ['open', 'verified'],
      signalTypes: ['log', 'trace'],
      q: 'token',
      page: 2,
    });

    expect(client.search).toHaveBeenCalledWith({
      index: 'findings',
      ignore_unavailable: true,
      from: 10,
      size: 10,
      query: {
        bool: {
          filter: [
            { terms: { finding_type: [...FINDING_TYPES] } },
            { terms: { repository: ['owner/repo'] } },
            { terms: { status: ['open', 'verified'] } },
            { terms: { signal_type: ['log', 'trace'] } },
          ],
          should: [
            { multi_match: { query: 'token', fields: ['title^2', 'summary'] } },
            { match_phrase_prefix: { 'evidence.path': 'token' } },
          ],
          minimum_should_match: 1,
        },
      },
      sort: ['_score', { updated_at: 'desc' }, '_doc'],
    });
  });

  it('returns full documents with ids and supports numeric totals', async () => {
    const { client, esClient } = setup();
    client.search.mockResolvedValueOnce({
      hits: { total: 1, hits: [{ _id: 'finding-1', _source: source }] },
    } as never);
    expect(await searchFindings(esClient, 'findings', params)).toEqual({
      page: 1,
      perPage: 10,
      total: 1,
      items: [{ id: 'finding-1', ...source }],
    });
  });
});

describe('getFinding', () => {
  it('returns undefined for found: false and ignores 404', async () => {
    const { client, esClient } = setup();
    expect(await getFinding(esClient, 'findings', 'missing')).toBeUndefined();
    expect(client.get).toHaveBeenCalledWith(
      { index: 'findings', id: 'missing' },
      { ignore: [404] }
    );
  });

  it('returns the full finding with its id', async () => {
    const { client, esClient } = setup();
    client.get.mockResolvedValueOnce({ found: true, _id: 'finding-1', _source: source } as never);
    expect(await getFinding(esClient, 'findings', 'finding-1')).toEqual({
      id: 'finding-1',
      ...source,
    });
  });
});

describe('updateFindingStatus', () => {
  it('sends review fields with wait_for refresh and returns the updated document', async () => {
    const { client, esClient } = setup();
    const updated = {
      ...source,
      status: 'verified',
      review_note: 'A token is logged.',
      reviewed_at: '2026-10-01T00:00:00.000Z',
    };
    client.update.mockResolvedValueOnce({ get: { _source: updated } });

    expect(
      await updateFindingStatus(esClient, 'findings', {
        id: 'finding-1',
        status: 'verified',
        note: updated.review_note,
        reviewedAt: updated.reviewed_at,
      })
    ).toEqual({ id: 'finding-1', ...updated });
    expect(client.update).toHaveBeenCalledWith(
      {
        index: 'findings',
        id: 'finding-1',
        _source: true,
        refresh: 'wait_for',
        doc: {
          status: 'verified',
          review_note: updated.review_note,
          reviewed_at: updated.reviewed_at,
        },
      },
      { ignore: [404] }
    );
  });

  it('returns undefined when there is no get and defaults the review time and absent note', async () => {
    const { client, esClient } = setup();
    expect(
      await updateFindingStatus(esClient, 'findings', { id: 'missing', status: 'invalid' })
    ).toBeUndefined();
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: { status: 'invalid', review_note: null, reviewed_at: expect.any(String) },
      }),
      { ignore: [404] }
    );
  });
});
