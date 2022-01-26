/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { MetricExpressionParams } from '../../../../plugins/infra/common/alerting/metrics';
import { getElasticsearchMetricQuery } from '../../../../plugins/infra/server/lib/alerting/metric_threshold/lib/metric_query';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const client = getService('es');
  const index = 'test-index';
  const getSearchParams = (aggType: string) =>
    ({
      aggType,
      timeUnit: 'm',
      timeSize: 5,
      ...(aggType !== 'count' ? { metric: 'test.metric' } : {}),
    } as MetricExpressionParams);
  describe('Metrics Threshold Alerts', () => {
    before(async () => {
      await client.index({
        index,
        body: {},
      });
    });
    const aggs = ['avg', 'min', 'max', 'rate', 'cardinality', 'count'];

    describe('querying the entire infrastructure', () => {
      for (const aggType of aggs) {
        it(`should work with the ${aggType} aggregator`, async () => {
          const timeframe = {
            start: moment().subtract(25, 'minutes').valueOf(),
            end: moment().valueOf(),
          };
          const searchBody = getElasticsearchMetricQuery(
            getSearchParams(aggType),
            '@timestamp',
            timeframe
          );
          const { body: result } = await client.search({
            index,
            // @ts-expect-error buckets_path is incompatible. expected 'string | string[] | Record<string, string> | undefined'.
            body: searchBody,
          });

          expect(result.hits).to.be.ok();
          if (aggType !== 'count') {
            expect(result.aggregations).to.be.ok();
          }
        });
      }
      it('should work with a filterQuery', async () => {
        const timeframe = {
          start: moment().subtract(25, 'minutes').valueOf(),
          end: moment().valueOf(),
        };
        const searchBody = getElasticsearchMetricQuery(
          getSearchParams('avg'),
          '@timestamp',
          timeframe,
          undefined,
          '{"bool":{"should":[{"match_phrase":{"agent.hostname":"foo"}}],"minimum_should_match":1}}'
        );
        const { body: result } = await client.search({
          index,
          // @ts-expect-error search is incompatible
          body: searchBody,
        });

        expect(result.hits).to.be.ok();
        expect(result.aggregations).to.be.ok();
      });
    });
    describe('querying with a groupBy parameter', () => {
      for (const aggType of aggs) {
        it(`should work with the ${aggType} aggregator`, async () => {
          const timeframe = {
            start: moment().subtract(25, 'minutes').valueOf(),
            end: moment().valueOf(),
          };
          const searchBody = getElasticsearchMetricQuery(
            getSearchParams(aggType),
            '@timestamp',
            timeframe,
            'agent.id'
          );
          const { body: result } = await client.search({
            index,
            // @ts-expect-error search is incompatible
            body: searchBody,
          });

          expect(result.hits).to.be.ok();
          expect(result.aggregations).to.be.ok();
        });
      }
      it('should work with a filterQuery', async () => {
        const timeframe = {
          start: moment().subtract(25, 'minutes').valueOf(),
          end: moment().valueOf(),
        };
        const searchBody = getElasticsearchMetricQuery(
          getSearchParams('avg'),
          '@timestamp',
          timeframe,
          'agent.id',
          '{"bool":{"should":[{"match_phrase":{"agent.hostname":"foo"}}],"minimum_should_match":1}}'
        );
        const { body: result } = await client.search({
          index,
          // @ts-expect-error search is incompatible
          body: searchBody,
        });

        expect(result.hits).to.be.ok();
        expect(result.aggregations).to.be.ok();
      });
    });
  });
}
