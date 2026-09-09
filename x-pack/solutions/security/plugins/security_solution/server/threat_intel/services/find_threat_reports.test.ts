/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  buildFindReportFilters,
  findThreatReports,
  USABLE_REPORT_FILTER,
} from './find_threat_reports';
import { encodeCursor } from '../lib/report_cursor';

const buildHit = ({
  id,
  sort,
  source,
}: {
  id: string;
  sort: Array<string | number | null>;
  source?: Record<string, unknown>;
}) => ({
  _id: id,
  _index: '.kibana-threat-reports',
  sort,
  _source: {
    revision: 1,
    content: { title: 'Report', body_text: 'Body text with indicators' },
    severity: { level: 'high', score: 0.8 },
    extracted: {
      iocs: [{ type: 'domain', value: 'evil.com' }],
    },
    ...source,
  },
});

const buildSearchResponse = (hits: ReturnType<typeof buildHit>[]) =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: hits.length, relation: 'eq' as const }, max_score: null, hits },
  } as const);

describe('buildFindReportFilters', () => {
  const defaultArgs = {
    spaceId: 'default',
  };

  it('returns a space filter for the current space and global sentinel', () => {
    expect(buildFindReportFilters(defaultArgs)).toEqual([
      { terms: { space_id: ['default', '*'] } },
    ]);
  });

  it('returns a source.name term when source is set', () => {
    expect(buildFindReportFilters({ ...defaultArgs, source: 'CISA' })).toEqual(
      expect.arrayContaining([{ term: { 'source.name': 'CISA' } }])
    );
  });

  it('returns a severity.level terms filter for multiple severities', () => {
    expect(buildFindReportFilters({ ...defaultArgs, severity: ['high', 'critical'] })).toEqual(
      expect.arrayContaining([{ terms: { 'severity.level': ['high', 'critical'] } }])
    );
  });

  it('returns an extracted.categories terms filter when category is set', () => {
    expect(buildFindReportFilters({ ...defaultArgs, category: 'ransomware' })).toEqual(
      expect.arrayContaining([{ terms: { 'extracted.categories': ['ransomware'] } }])
    );
  });

  it('returns an @timestamp range when from/to are set', () => {
    expect(
      buildFindReportFilters({
        ...defaultArgs,
        from: '2024-01-01T00:00:00.000Z',
        to: '2024-02-01T00:00:00.000Z',
      })
    ).toEqual(
      expect.arrayContaining([
        {
          range: {
            '@timestamp': {
              gte: '2024-01-01T00:00:00.000Z',
              lte: '2024-02-01T00:00:00.000Z',
            },
          },
        },
      ])
    );
  });

  it('returns the usable-bar filter when usableOnly is true', () => {
    expect(buildFindReportFilters({ ...defaultArgs, usableOnly: true })).toEqual(
      expect.arrayContaining([USABLE_REPORT_FILTER])
    );
  });
});

describe('findThreatReports', () => {
  const defaultArgs = {
    spaceId: 'default',
    pageSize: 2,
  };

  it('returns mapped summary items from search hits', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(
      buildSearchResponse([buildHit({ id: 'r1', sort: [0.9, 'r1'] })]) as never
    );

    const result = await findThreatReports(esClient, defaultArgs);

    expect(result.items).toEqual([
      expect.objectContaining({
        reportId: 'r1',
        revision: 1,
        title: 'Report',
        severity: { level: 'high', score: 0.8 },
        iocs: [{ type: 'domain', value: 'evil.com' }],
      }),
    ]);
  });

  it('returns a nextCursor when more pages remain', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(
      buildSearchResponse([
        buildHit({ id: 'r1', sort: [0.9, 'r1'] }),
        buildHit({ id: 'r2', sort: [0.8, 'r2'] }),
        buildHit({ id: 'r3', sort: [0.7, 'r3'] }),
      ]) as never
    );

    const result = await findThreatReports(esClient, defaultArgs);

    expect(result.nextCursor).toBe(encodeCursor([0.8, 'r2']));
  });

  it('returns a null nextCursor on the last page', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(
      buildSearchResponse([buildHit({ id: 'r1', sort: [0.9, 'r1'] })]) as never
    );

    const result = await findThreatReports(esClient, defaultArgs);

    expect(result.nextCursor).toBeNull();
  });

  it('returns a search that sorts by extracted.relevance for sort=relevance', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(buildSearchResponse([]) as never);

    await findThreatReports(esClient, { ...defaultArgs, sort: 'relevance' });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          { 'extracted.relevance': { order: 'desc', missing: '_last' } },
          { _id: { order: 'asc' } },
        ],
      })
    );
  });

  it('returns a search that sorts by rank_score for sort=rank', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(buildSearchResponse([]) as never);

    await findThreatReports(esClient, { ...defaultArgs, sort: 'rank' });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ rank_score: { order: 'desc', missing: '_last' } }, { _id: { order: 'asc' } }],
      })
    );
  });

  it('returns a search that sorts by lineage.extracted_at for sort=updated_at', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(buildSearchResponse([]) as never);

    await findThreatReports(esClient, { ...defaultArgs, sort: 'updated_at' });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          { 'lineage.extracted_at': { order: 'desc', missing: '_last' } },
          { _id: { order: 'asc' } },
        ],
      })
    );
  });

  it('returns a search_after from a decoded cursor', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(buildSearchResponse([]) as never);
    const cursor = encodeCursor([0.5, 'prev-id']);

    await findThreatReports(esClient, { ...defaultArgs, cursor });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        search_after: [0.5, 'prev-id'],
      })
    );
  });

  it('returns diamond summary fields when present on the hit', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(
      buildSearchResponse([
        buildHit({
          id: 'r1',
          sort: [0.9, 'r1'],
          source: {
            extracted: {
              iocs: [{ type: 'domain', value: 'evil.com' }],
              diamond: { signal_count: 3, suitable: true },
            },
          },
        }),
      ]) as never
    );

    const result = await findThreatReports(esClient, defaultArgs);

    expect(result.items[0].diamond).toEqual({ signalCount: 3, suitable: true });
  });

  it('returns a search using the hidden-index wildcard options', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(buildSearchResponse([]) as never);

    await findThreatReports(esClient, defaultArgs);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.kibana-threat-reports*',
        expand_wildcards: ['open', 'hidden'],
        ignore_unavailable: true,
        allow_no_indices: true,
      })
    );
  });
});
