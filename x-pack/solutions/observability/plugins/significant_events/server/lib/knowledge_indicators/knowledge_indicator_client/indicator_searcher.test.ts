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
import { queryEsql } from '../../significant_events/latest_source_query';

jest.mock('../../significant_events/latest_source_query', () => ({
  ...jest.requireActual('../../significant_events/latest_source_query'),
  queryEsql: jest.fn(),
}));

const SPACE = 'team-a';
const T1 = '2026-01-01T00:00:00.000Z';
const T2 = '2026-01-02T00:00:00.000Z';

const rankResponse = (rows: Array<[string, string, string, string]>) => ({
  columns: [
    { name: 'id', type: 'keyword' },
    { name: 'source.id', type: 'keyword' },
    { name: 'type', type: 'keyword' },
    { name: '@timestamp', type: 'date' },
  ],
  values: rows,
});

const storedFeatureIn = (sourceId: string, id: string, timestamp: string) => ({
  '@timestamp': timestamp,
  id,
  type: 'feature',
  title: id,
  description: 'desc',
  'source.id': sourceId,
  feature: { type: 'technology', slug: 'redis', properties: {}, confidence: 50 },
});

describe('IndicatorSearcher.findFeaturesAcrossSources', () => {
  const fetchLatestRevisions = jest.fn();
  const searcher = new IndicatorSearcher(
    elasticsearchServiceMock.createElasticsearchClient(),
    loggingSystemMock.createLogger(),
    { semantic_min_score: 0, rrf_rank_constant: 60 },
    { fetchLatestRevisions } as unknown as RevisionReader,
    SPACE
  );

  beforeEach(() => jest.clearAllMocks());

  const run = (limit?: number) =>
    searcher.findFeaturesAcrossSources(['src-a', 'src-b'], 'redis cache', {
      featureType: 'technology',
      searchMode: 'semantic',
      limit,
    });

  it('ranks first, then resolves the latest revision of each group in rank order', async () => {
    (queryEsql as jest.Mock).mockResolvedValue(
      rankResponse([
        ['u2', 'src-b', 'feature', T2],
        ['u1', 'src-a', 'feature', T1],
      ])
    );
    fetchLatestRevisions.mockResolvedValue([
      storedFeatureIn('src-a', 'u1', T1),
      storedFeatureIn('src-b', 'u2', T2),
    ]);

    const { hits } = await run();

    expect(hits.map(({ source_id: sourceId }) => sourceId)).toEqual(['src-b', 'src-a']);
    expect(queryEsql).toHaveBeenCalledTimes(1);
    const [, postGroupingWhere] = fetchLatestRevisions.mock.calls[0];
    expect(BasicPrettyPrinter.expression(postGroupingWhere)).toContain(
      '`feature.type` IN ("technology")'
    );
  });

  it('selects current revisions before filtering and ranking the scoped corpus', async () => {
    (queryEsql as jest.Mock).mockResolvedValue(rankResponse([]));

    await run();

    const [{ query }] = (queryEsql as jest.Mock).mock.calls[0];
    const printed = query.print('basic');
    expect(printed).toContain(`\`kibana.space_ids\` == "${SPACE}"`);
    expect(printed).toContain('`source.id` IN ("src-a", "src-b")');
    const latestRevisionIndex = printed.indexOf('INLINE STATS latest_ts');
    expect(latestRevisionIndex).toBeLessThan(printed.indexOf('deleted IS NULL'));
    expect(latestRevisionIndex).toBeLessThan(printed.indexOf('`feature.type` IN ("technology")'));
    expect(printed.indexOf('`feature.type` IN ("technology")')).toBeLessThan(
      printed.indexOf('MATCH(')
    );
    expect(fetchLatestRevisions).not.toHaveBeenCalled();
  });

  it('returns a newer authoritative revision written after ranking', async () => {
    (queryEsql as jest.Mock).mockResolvedValue(
      rankResponse([
        ['u1', 'src-a', 'feature', T1],
        ['u1', 'src-a', 'feature', T2],
      ])
    );
    fetchLatestRevisions.mockResolvedValue([
      storedFeatureIn('src-a', 'u1', '2026-03-01T00:00:00.000Z'),
    ]);

    const { hits } = await run();

    expect(hits.map(({ uuid, updated_at: updatedAt }) => [uuid, updatedAt])).toEqual([
      ['u1', '2026-03-01T00:00:00.000Z'],
    ]);
  });

  it('drops a ranked group that is deleted, excluded or expired in its latest revision', async () => {
    (queryEsql as jest.Mock).mockResolvedValue(rankResponse([['u1', 'src-a', 'feature', T1]]));
    fetchLatestRevisions.mockResolvedValue([]);

    expect((await run()).hits).toEqual([]);
  });

  it('applies the caller limit in rank order', async () => {
    (queryEsql as jest.Mock).mockResolvedValue(
      rankResponse([
        ['u1', 'src-a', 'feature', T1],
        ['u2', 'src-b', 'feature', T1],
      ])
    );
    fetchLatestRevisions.mockResolvedValue([
      storedFeatureIn('src-a', 'u1', T1),
      storedFeatureIn('src-b', 'u2', T1),
    ]);

    const { hits } = await run(1);

    expect(hits.map(({ uuid }) => uuid)).toEqual(['u1']);
  });
});
