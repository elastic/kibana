/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { Pagination } from '@kbn/slo-schema/src/models/pagination';
import { createSLO } from '../fixtures/slo';
import {
  aHitFromSummaryIndex,
  aHitFromTempSummaryIndex,
  aSummaryDocument,
} from '../fixtures/summary_search_document';
import { DEFAULT_SETTINGS } from '../slo_settings_repository';
import { DefaultSummarySearchClient } from './summary_search_client';
import type { Sort, SummarySearchClient } from './types';

const defaultSort: Sort = {
  field: 'sli_value',
  direction: 'asc',
};
const defaultPagination: Pagination = {
  page: 1,
  perPage: 20,
};

describe('Summary Search Client', () => {
  let scopedClusterClient: IScopedClusterClient;
  let service: SummarySearchClient;
  let esClientMock: ElasticsearchClientMock;

  beforeEach(() => {
    scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    esClientMock = scopedClusterClient.asCurrentUser as ElasticsearchClientMock;
    service = new DefaultSummarySearchClient(
      scopedClusterClient,
      loggerMock.create(),
      'default',
      DEFAULT_SETTINGS
    );
  });

  it('returns an empty response on error', async () => {
    esClientMock.count.mockRejectedValue(new Error('Cannot reach es'));

    await expect(service.search('', '', defaultSort, defaultPagination)).resolves
      .toMatchInlineSnapshot(`
      Object {
        "page": 1,
        "perPage": 20,
        "results": Array [],
        "total": 0,
      }
    `);
  });

  it('returns an empty response when the kql filter returns no document count', async () => {
    esClientMock.count.mockResolvedValue({
      count: 0,
      _shards: { failed: 0, successful: 1, total: 1 },
    });

    await expect(service.search('', '', defaultSort, defaultPagination)).resolves
      .toMatchInlineSnapshot(`
      Object {
        "page": 1,
        "perPage": 20,
        "results": Array [],
        "total": 0,
      }
    `);
  });

  it('returns the summary documents without duplicate temporary summary documents', async () => {
    const SLO_ID1 = createSLO({ id: 'slo-one' });
    const SLO_ID2 = createSLO({ id: 'slo_two' });
    const SLO_ID3 = createSLO({ id: 'slo-three' });
    const SLO_ID4 = createSLO({ id: 'slo-four' });
    const SLO_ID5 = createSLO({ id: 'slo-five' });

    esClientMock.search.mockResolvedValue({
      took: 0,
      timed_out: false,
      _shards: {
        total: 2,
        successful: 2,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 8,
          relation: 'eq',
        },
        max_score: 1,
        hits: [
          aHitFromSummaryIndex(aSummaryDocument(SLO_ID1, { isTempDoc: false })),
          aHitFromSummaryIndex(aSummaryDocument(SLO_ID2, { isTempDoc: false })),
          aHitFromSummaryIndex(aSummaryDocument(SLO_ID3, { isTempDoc: false })),
          aHitFromSummaryIndex(aSummaryDocument(SLO_ID5, { isTempDoc: false })), // no related temp doc
          aHitFromTempSummaryIndex(aSummaryDocument(SLO_ID1, { isTempDoc: true })), // removed as dup
          aHitFromTempSummaryIndex(aSummaryDocument(SLO_ID2, { isTempDoc: true })), // removed as dup
          aHitFromTempSummaryIndex(aSummaryDocument(SLO_ID3, { isTempDoc: true })), // removed as dup
          aHitFromTempSummaryIndex(aSummaryDocument(SLO_ID4, { isTempDoc: true })), // kept
        ],
      },
    });

    const results = await service.search('', '', defaultSort, defaultPagination);

    expect(esClientMock.deleteByQuery).toHaveBeenCalled();
    expect(esClientMock.deleteByQuery.mock.calls[0]).toMatchSnapshot();
    expect(results).toMatchSnapshot();
    expect(results.total).toBe(5);
  });

  it('handles hideStale filter', async () => {
    await service.search('', '', defaultSort, defaultPagination, true);
    expect(esClientMock.search.mock.calls[0]).toEqual([
      {
        from: 0,
        index: ['.slo-observability.summary-v3*'],
        query: {
          bool: {
            filter: [
              {
                term: {
                  spaceId: 'default',
                },
              },
              {
                bool: {
                  should: [
                    {
                      term: {
                        isTempDoc: true,
                      },
                    },
                    {
                      range: {
                        summaryUpdatedAt: {
                          gte: 'now-48h',
                        },
                      },
                    },
                  ],
                },
              },
              {
                match_all: {},
              },
            ],
            must_not: [],
          },
        },
        size: 40,
        sort: {
          isTempDoc: {
            order: 'asc',
          },
          sliValue: {
            order: 'asc',
          },
          'slo.id': {
            order: 'asc',
          },
          'slo.instanceId': {
            order: 'asc',
          },
        },
        track_total_hits: true,
      },
    ]);

    await service.search('', '', defaultSort, defaultPagination);
    expect(esClientMock.search.mock.calls[1]).toEqual([
      {
        from: 0,
        index: ['.slo-observability.summary-v3*'],
        query: {
          bool: {
            filter: [
              {
                term: {
                  spaceId: 'default',
                },
              },
              {
                match_all: {},
              },
            ],
            must_not: [],
          },
        },
        size: 40,
        sort: {
          isTempDoc: {
            order: 'asc',
          },
          sliValue: {
            order: 'asc',
          },
          'slo.id': {
            order: 'asc',
          },
          'slo.instanceId': {
            order: 'asc',
          },
        },
        track_total_hits: true,
      },
    ]);
  });

  it('handles summaryUpdate kql filter override', async () => {
    await service.search('summaryUpdatedAt > now-2h', '', defaultSort, defaultPagination, true);
    expect(esClientMock.search.mock.calls[0]).toEqual([
      {
        from: 0,
        index: ['.slo-observability.summary-v3*'],
        query: {
          bool: {
            filter: [
              { term: { spaceId: 'default' } },
              {
                bool: {
                  filter: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
                          {
                            range: {
                              summaryUpdatedAt: {
                                gt: 'now-2h',
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  must: [],
                  must_not: [],
                  should: [],
                },
              },
            ],
            must_not: [],
          },
        },
        size: 40,
        sort: {
          isTempDoc: { order: 'asc' },
          sliValue: { order: 'asc' },
          'slo.id': {
            order: 'asc',
          },
          'slo.instanceId': {
            order: 'asc',
          },
        },
        track_total_hits: true,
      },
    ]);
  });
});
