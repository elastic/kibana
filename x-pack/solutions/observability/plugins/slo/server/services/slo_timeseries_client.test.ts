/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { ALL_VALUE } from '@kbn/slo-schema';
import moment from 'moment';
import { createSLO, createSLOWithTimeslicesBudgetingMethod } from './fixtures/slo';
import { SloTimeseriesClient } from './slo_timeseries_client';

const commonEsResponse = {
  took: 100,
  timed_out: false,
  _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
  hits: { hits: [] },
};

describe('SloTimeseriesClient', () => {
  let esClientMock: ElasticsearchClientMock;
  let client: SloTimeseriesClient;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    client = new SloTimeseriesClient(esClientMock);
  });

  describe('fetch', () => {
    it('returns timeseries data points for a rolling occurrences SLO', async () => {
      const slo = createSLO();
      const from = moment().subtract(7, 'days').toDate();
      const to = new Date();

      esClientMock.search.mockResolvedValueOnce({
        ...commonEsResponse,
        aggregations: {
          daily: {
            buckets: [
              {
                key_as_string: moment(from).add(1, 'day').toISOString(),
                key: moment(from).add(1, 'day').valueOf(),
                doc_count: 100,
                good: { value: 97 },
                total: { value: 100 },
                cumulative_good: { value: 970 },
                cumulative_total: { value: 1000 },
              },
              {
                key_as_string: moment(from).add(2, 'days').toISOString(),
                key: moment(from).add(2, 'days').valueOf(),
                doc_count: 100,
                good: { value: 95 },
                total: { value: 100 },
                cumulative_good: { value: 1940 },
                cumulative_total: { value: 2000 },
              },
            ],
          },
        },
      });

      const result = await client.fetch({
        slo,
        instanceId: ALL_VALUE,
        from,
        to,
        includeRaw: false,
      });

      expect(result.sloId).toBe(slo.id);
      expect(result.instanceId).toBe(ALL_VALUE);
      expect(result.dataPoints).toHaveLength(2);
      expect(result.dataPoints[0]).toEqual(
        expect.objectContaining({
          sliValue: expect.any(Number),
          status: expect.any(String),
          errorBudget: expect.objectContaining({
            initial: expect.any(Number),
            consumed: expect.any(Number),
            remaining: expect.any(Number),
            isEstimated: expect.any(Boolean),
          }),
        })
      );
      expect(result.dataPoints[0].numerator).toBeUndefined();
      expect(result.dataPoints[0].denominator).toBeUndefined();
    });

    it('includes raw numerator/denominator when includeRaw is true', async () => {
      const slo = createSLO();
      const from = moment().subtract(7, 'days').toDate();
      const to = new Date();

      esClientMock.search.mockResolvedValueOnce({
        ...commonEsResponse,
        aggregations: {
          daily: {
            buckets: [
              {
                key_as_string: moment(from).add(1, 'day').toISOString(),
                key: moment(from).add(1, 'day').valueOf(),
                doc_count: 100,
                good: { value: 97 },
                total: { value: 100 },
                cumulative_good: { value: 970 },
                cumulative_total: { value: 1000 },
              },
            ],
          },
        },
      });

      const result = await client.fetch({
        slo,
        instanceId: ALL_VALUE,
        from,
        to,
        includeRaw: true,
      });

      expect(result.dataPoints[0].numerator).toBe(97);
      expect(result.dataPoints[0].denominator).toBe(100);
    });

    it('works with timeslices budgeting method', async () => {
      const slo = createSLOWithTimeslicesBudgetingMethod();
      const from = moment().subtract(7, 'days').toDate();
      const to = new Date();

      esClientMock.search.mockResolvedValueOnce({
        ...commonEsResponse,
        aggregations: {
          daily: {
            buckets: [
              {
                key_as_string: moment(from).add(1, 'day').toISOString(),
                key: moment(from).add(1, 'day').valueOf(),
                doc_count: 100,
                good: { value: 95 },
                total: { value: 100 },
                cumulative_good: { value: 950 },
                cumulative_total: { value: 1000 },
              },
            ],
          },
        },
      });

      const result = await client.fetch({
        slo,
        instanceId: ALL_VALUE,
        from,
        to,
        includeRaw: false,
      });

      expect(result.dataPoints).toHaveLength(1);
      expect(result.dataPoints[0].sliValue).toEqual(expect.any(Number));
      expect(result.dataPoints[0].status).toEqual(expect.any(String));
    });

    it('uses custom bucket interval when provided', async () => {
      const slo = createSLO();
      const from = moment().subtract(30, 'days').toDate();
      const to = new Date();

      esClientMock.search.mockResolvedValueOnce({
        ...commonEsResponse,
        aggregations: { daily: { buckets: [] } },
      });

      await client.fetch({
        slo,
        instanceId: ALL_VALUE,
        from,
        to,
        bucketInterval: '1h',
        includeRaw: false,
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            aggs: expect.objectContaining({
              daily: expect.objectContaining({
                date_histogram: expect.objectContaining({
                  fixed_interval: '1h',
                }),
              }),
            }),
          }),
        })
      );
    });

    it('returns empty data points when no aggregation buckets', async () => {
      const slo = createSLO();
      const from = moment().subtract(7, 'days').toDate();
      const to = new Date();

      esClientMock.search.mockResolvedValueOnce({
        ...commonEsResponse,
        aggregations: { daily: { buckets: [] } },
      });

      const result = await client.fetch({
        slo,
        instanceId: ALL_VALUE,
        from,
        to,
        includeRaw: false,
      });

      expect(result.dataPoints).toHaveLength(0);
    });

    it('filters by instanceId when groupBy is set', async () => {
      const slo = createSLO({ groupBy: 'service.name' });
      const from = moment().subtract(7, 'days').toDate();
      const to = new Date();

      esClientMock.search.mockResolvedValueOnce({
        ...commonEsResponse,
        aggregations: { daily: { buckets: [] } },
      });

      await client.fetch({
        slo,
        instanceId: 'my-service',
        from,
        to,
        includeRaw: false,
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.objectContaining({
                filter: expect.arrayContaining([
                  { term: { 'slo.instanceId': 'my-service' } },
                ]),
              }),
            }),
          }),
        })
      );
    });
  });
});
