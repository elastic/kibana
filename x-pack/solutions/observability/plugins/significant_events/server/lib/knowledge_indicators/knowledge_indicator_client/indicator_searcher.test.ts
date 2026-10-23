/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { IndicatorSearcher } from './indicator_searcher';
import type { RevisionReader } from './revision_reader';
import type { SearchEmbeddingModel } from './search_embedding_model';
import { queryEsql } from '../../significant_events/latest_source_query';

jest.mock('../../significant_events/latest_source_query', () => ({
  ...jest.requireActual('../../significant_events/latest_source_query'),
  queryEsql: jest.fn(),
}));

const SPACE = 'team-a';
const T1 = '2026-01-01T00:00:00.000Z';

const emptyRankResponse = {
  columns: [
    { name: 'id', type: 'keyword' },
    { name: 'source.id', type: 'keyword' },
    { name: 'type', type: 'keyword' },
    { name: '@timestamp', type: 'date' },
  ],
  values: [],
};

const storedFeature = {
  '@timestamp': T1,
  id: 'u1',
  revision_id: `src-a:feature:u1:${T1}`,
  type: 'feature',
  title: 'redis',
  description: 'desc',
  'source.id': 'src-a',
  feature: { type: 'technology', slug: 'redis', properties: {}, confidence: 50 },
};

describe('IndicatorSearcher ranking function per embedding model', () => {
  const fetchLatestRevisions = jest.fn();
  const resolveEmbeddingModel = jest.fn<Promise<SearchEmbeddingModel>, []>();
  const searcher = new IndicatorSearcher(
    elasticsearchServiceMock.createElasticsearchClient(),
    loggingSystemMock.createLogger(),
    { semantic_min_score: 0, rrf_rank_constant: 60 },
    { fetchLatestRevisions } as unknown as RevisionReader,
    SPACE,
    resolveEmbeddingModel
  );

  const rankCall = () => (queryEsql as jest.Mock).mock.calls[0][0];
  const rankQuery = () => rankCall().query;

  beforeEach(() => {
    jest.clearAllMocks();
    resolveEmbeddingModel.mockResolvedValue({ kind: 'sparse' });
    fetchLatestRevisions.mockResolvedValue([storedFeature]);
    (queryEsql as jest.Mock).mockResolvedValue(emptyRankResponse);
  });

  const run = (searchMode: 'semantic' | 'keyword' | 'hybrid' = 'semantic') =>
    searcher.findFeatures('src-a', 'redis cache', { searchMode, limit: 50 });

  it('ranks a dense model with KNN(TEXT_EMBEDDING) and binds the params', async () => {
    resolveEmbeddingModel.mockResolvedValue({ kind: 'dense', inferenceId: '.jina-v5' });

    await run();

    const printed = rankQuery().print('basic');
    expect(printed).toContain('KNN(search_embedding, TEXT_EMBEDDING(?q, ?inference_id))');
    expect(printed).not.toContain('MATCH(');
    expect(printed).toContain('LIMIT 50');
    expect(rankQuery().toRequest().params).toEqual(
      expect.arrayContaining([{ q: 'redis cache' }, { inference_id: '.jina-v5' }])
    );
  });

  it('prefilters on the latest revision ids in WHERE instead of a request filter', async () => {
    resolveEmbeddingModel.mockResolvedValue({ kind: 'dense', inferenceId: '.jina-v5' });

    await run();

    const printed = rankQuery().print('basic');
    expect(printed).toContain(`revision_id IN ("${storedFeature.revision_id}")`);
    expect(printed.indexOf('revision_id IN')).toBeLessThan(printed.indexOf('FORK'));
    expect(rankCall().filter).toBeUndefined();
  });

  it('ranks a sparse model with MATCH', async () => {
    await run();

    const printed = rankQuery().print('basic');
    expect(printed).toContain('MATCH(search_embedding, ?q)');
    expect(printed).not.toContain('KNN(');
  });

  it('binds the semantic params in hybrid mode', async () => {
    resolveEmbeddingModel.mockResolvedValue({ kind: 'dense', inferenceId: '.jina-v5' });

    await run('hybrid');

    expect(rankQuery().print('basic')).toContain('KNN(search_embedding, TEXT_EMBEDDING(');
    expect(rankQuery().toRequest().params).toEqual(
      expect.arrayContaining([{ q: 'redis cache' }, { inference_id: '.jina-v5' }])
    );
  });

  it('does not look the model up for keyword ranking', async () => {
    await run('keyword');

    expect(resolveEmbeddingModel).not.toHaveBeenCalled();
    expect(rankQuery().print('basic')).not.toContain('KNN(');
  });
});
