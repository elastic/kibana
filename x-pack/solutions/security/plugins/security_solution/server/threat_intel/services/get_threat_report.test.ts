/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getThreatReport, ThreatReportNotFoundError } from './get_threat_report';

const buildSearchResponse = (hits: Array<Record<string, unknown>>) =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: hits.length, relation: 'eq' as const }, max_score: null, hits },
  } as const);

describe('getThreatReport', () => {
  const defaultArgs = {
    spaceId: 'default',
    reportId: 'default:abc',
  };

  it('returns the full source with reportId and revision', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(
      buildSearchResponse([
        {
          _id: 'default:abc',
          _index: '.kibana-threat-reports',
          _source: {
            revision: 2,
            space_id: 'default',
            content: { title: 'Title', body_text: 'Body' },
            severity: { level: 'medium', score: 0.5 },
          },
        },
      ]) as never
    );

    const result = await getThreatReport(esClient, defaultArgs);

    expect(result).toEqual({
      reportId: 'default:abc',
      revision: 2,
      space_id: 'default',
      content: { title: 'Title', body_text: 'Body' },
      severity: { level: 'medium', score: 0.5 },
    });
  });

  it('returns a search filtered by ids and space terms', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(buildSearchResponse([]) as never);

    await expect(getThreatReport(esClient, defaultArgs)).rejects.toThrow(ThreatReportNotFoundError);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.kibana-threat-reports*',
        query: {
          bool: {
            filter: [
              { ids: { values: ['default:abc'] } },
              { terms: { space_id: ['default', '*'] } },
            ],
          },
        },
      })
    );
  });

  it('throws ThreatReportNotFoundError when no hit is returned', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(buildSearchResponse([]) as never);

    await expect(getThreatReport(esClient, defaultArgs)).rejects.toThrow(
      'Report default:abc not found'
    );
  });

  it('returns revision 0 when the stored revision field is absent', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(
      buildSearchResponse([
        {
          _id: 'default:abc',
          _index: '.kibana-threat-reports',
          _source: { space_id: 'default', content: { title: 'Title' } },
        },
      ]) as never
    );

    const result = await getThreatReport(esClient, defaultArgs);

    expect(result.revision).toBe(0);
  });

  it('returns a search using hidden-index wildcard options', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(
      buildSearchResponse([
        {
          _id: 'default:abc',
          _index: '.kibana-threat-reports',
          _source: { revision: 1, space_id: 'default' },
        },
      ]) as never
    );

    await getThreatReport(esClient, defaultArgs);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        expand_wildcards: ['open', 'hidden'],
        ignore_unavailable: true,
        allow_no_indices: true,
      })
    );
  });
});
