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

  describe('space-keyed attribution projection', () => {
    const twoSpaceSource = {
      revision: 3,
      space_id: '*',
      content: { title: 'Shared report' },
      attribution: [
        {
          space_id: 'default',
          environment_hits: { window: '7d', layer_1_ioc_match: 1, layer_2_behavioral: 2 },
          environment_hits_total: 3,
        },
        {
          space_id: 'team-b',
          environment_hits: { window: '7d', layer_1_ioc_match: 9, layer_2_behavioral: 9 },
          environment_hits_total: 18,
        },
      ],
    };

    const mockHit = (source: Record<string, unknown>) => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue(
        buildSearchResponse([
          { _id: 'default:abc', _index: '.kibana-threat-reports', _source: source },
        ]) as never
      );
      return esClient;
    };

    it('returns only the caller space element, flattened, on a shared report', async () => {
      const result = await getThreatReport(mockHit(twoSpaceSource), defaultArgs);

      expect(result.attribution).toEqual({
        space_id: 'default',
        environment_hits: { window: '7d', layer_1_ioc_match: 1, layer_2_behavioral: 2 },
        environment_hits_total: 3,
      });
      // The other space's element must not leak through.
      expect(JSON.stringify(result)).not.toContain('team-b');
    });

    it('omits attribution when no element exists for the caller space', async () => {
      const esClient = mockHit(twoSpaceSource);
      const result = await getThreatReport(esClient, { ...defaultArgs, spaceId: 'team-c' });

      expect(result.attribution).toBeUndefined();
      expect('attribution' in result).toBe(false);
    });

    it('passes a legacy flat attribution object through unchanged rather than hiding it', async () => {
      // A stale (not recreated) index holds the pre-v29 flat shape. Collapsing
      // that into "absent" would make a broken deployment look like "not hunted
      // here", so the legacy object is returned as-is.
      const legacy = {
        revision: 1,
        space_id: 'default',
        attribution: {
          environment_hits: { window: '7d', layer_1_ioc_match: 5, layer_2_behavioral: 0 },
          environment_hits_total: 5,
        },
      };

      const result = await getThreatReport(mockHit(legacy), defaultArgs);

      expect(result.attribution).toEqual(legacy.attribution);
    });
  });
});
