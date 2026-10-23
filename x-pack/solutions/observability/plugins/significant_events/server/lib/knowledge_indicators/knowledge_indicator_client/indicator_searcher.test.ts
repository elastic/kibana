/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { BasicPrettyPrinter } from '@elastic/esql';
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
const T2 = '2026-01-02T00:00:00.000Z';

const rankResponse = (rows: Array<[string, string, string, string, (string | null)?]>) => ({
  columns: [
    { name: 'id', type: 'keyword' },
    { name: 'source.id', type: 'keyword' },
    { name: 'type', type: 'keyword' },
    { name: '@timestamp', type: 'date' },
    { name: 'label', type: 'keyword' },
  ],
  values: rows.map(([id, sourceId, type, timestamp, label]) => [
    id,
    sourceId,
    type,
    timestamp,
    label === undefined ? 'semantic' : label,
  ]),
});

const storedFeatureIn = (sourceId: string, id: string, timestamp: string) => ({
  '@timestamp': timestamp,
  id,
  revision_id: `${sourceId}:feature:${id}:${timestamp}`,
  type: 'feature',
  title: id,
  description: 'desc',
  'source.id': sourceId,
  feature: { type: 'technology', slug: 'redis', properties: {}, confidence: 50 },
});

const storedFeature = storedFeatureIn('src-a', 'u1', T1);

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
    (queryEsql as jest.Mock).mockResolvedValue(rankResponse([]));
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

describe('IndicatorSearcher.findFeaturesAcrossSources', () => {
  const fetchLatestRevisions = jest.fn();
  const resolveEmbeddingModel = jest.fn<Promise<SearchEmbeddingModel>, []>();
  const createSearcher = (semanticMinScore = 0) =>
    new IndicatorSearcher(
      elasticsearchServiceMock.createElasticsearchClient(),
      loggingSystemMock.createLogger(),
      { semantic_min_score: semanticMinScore, rrf_rank_constant: 60 },
      { fetchLatestRevisions } as unknown as RevisionReader,
      SPACE,
      resolveEmbeddingModel
    );
  const searcher = createSearcher();

  beforeEach(() => {
    jest.clearAllMocks();
    resolveEmbeddingModel.mockResolvedValue({ kind: 'dense', inferenceId: '.jina-v5' });
  });

  const run = (limit?: number, instance = searcher) =>
    instance.findFeaturesAcrossSources(['src-a', 'src-b'], 'redis cache', {
      featureType: 'technology',
      searchMode: 'semantic',
      limit,
    });

  it('reads the current revisions first, then surfaces them in rank order', async () => {
    fetchLatestRevisions.mockResolvedValue([
      storedFeatureIn('src-a', 'u1', T1),
      storedFeatureIn('src-b', 'u2', T2),
    ]);
    (queryEsql as jest.Mock).mockResolvedValue(
      rankResponse([
        ['u2', 'src-b', 'feature', T2],
        ['u1', 'src-a', 'feature', T1],
      ])
    );

    const { hits } = await run();

    expect(hits.map(({ source_id: sourceId }) => sourceId)).toEqual(['src-b', 'src-a']);
    expect(fetchLatestRevisions.mock.invocationCallOrder[0]).toBeLessThan(
      (queryEsql as jest.Mock).mock.invocationCallOrder[0]
    );
    const [, postGroupingWhere] = fetchLatestRevisions.mock.calls[0];
    const printedPostGrouping = BasicPrettyPrinter.expression(postGroupingWhere);
    expect(printedPostGrouping).toContain('`feature.type` IN ("technology")');
    expect(printedPostGrouping).toContain('deleted IS NULL');
  });

  it('prefilters ranking on the current revision ids instead of folding latest-per-group', async () => {
    const docs = [storedFeatureIn('src-a', 'u1', T1), storedFeatureIn('src-b', 'u2', T2)];
    fetchLatestRevisions.mockResolvedValue(docs);
    (queryEsql as jest.Mock).mockResolvedValue(rankResponse([]));

    await run();

    const [{ query, filter }] = (queryEsql as jest.Mock).mock.calls[0];
    const printed = query.print('basic');
    expect(printed).toContain(`\`kibana.space_ids\` == "${SPACE}"`);
    expect(printed).toContain('`source.id` IN ("src-a", "src-b")');
    expect(printed).toContain(
      `revision_id IN ("${docs[0].revision_id}", "${docs[1].revision_id}")`
    );
    expect(printed.indexOf('revision_id IN')).toBeLessThan(printed.indexOf('FORK'));
    expect(printed).not.toContain('INLINE STATS');
    expect(printed).toContain('LIMIT 300');
    expect(filter).toBeUndefined();
  });

  it('skips ranking when no current revision matches', async () => {
    fetchLatestRevisions.mockResolvedValue([]);

    expect((await run()).hits).toEqual([]);
    expect(queryEsql).not.toHaveBeenCalled();
  });

  it('retries without the semantic threshold when no ranked row carries the semantic label', async () => {
    fetchLatestRevisions.mockResolvedValue([
      storedFeatureIn('src-a', 'u1', T1),
      storedFeatureIn('src-b', 'u2', T1),
    ]);
    (queryEsql as jest.Mock)
      .mockResolvedValueOnce(rankResponse([['u1', 'src-a', 'feature', T1, null]]))
      .mockResolvedValueOnce(
        rankResponse([
          ['u2', 'src-b', 'feature', T1],
          ['u1', 'src-a', 'feature', T1, null],
        ])
      );

    const { hits } = await run(undefined, createSearcher(0.1));

    expect(queryEsql).toHaveBeenCalledTimes(2);
    const [{ query: first }] = (queryEsql as jest.Mock).mock.calls[0];
    const [{ query: second }] = (queryEsql as jest.Mock).mock.calls[1];
    expect(first.print('basic')).toContain('WHERE _score >= 0.1');
    expect(second.print('basic')).toContain('WHERE _score >= 0');
    expect(second.print('basic')).not.toContain('WHERE _score >= 0.1');
    expect(hits.map(({ uuid }) => uuid)).toEqual(['u2', 'u1']);
  });

  it('applies the caller limit in rank order', async () => {
    fetchLatestRevisions.mockResolvedValue([
      storedFeatureIn('src-a', 'u1', T1),
      storedFeatureIn('src-b', 'u2', T1),
    ]);
    (queryEsql as jest.Mock).mockResolvedValue(
      rankResponse([
        ['u1', 'src-a', 'feature', T1],
        ['u2', 'src-b', 'feature', T1],
      ])
    );

    const { hits } = await run(1);

    expect(hits.map(({ uuid }) => uuid)).toEqual(['u1']);
  });
});
