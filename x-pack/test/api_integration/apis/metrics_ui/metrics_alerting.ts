/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { MetricExpressionParams } from '@kbn/infra-plugin/common/alerting/metrics';
import { getElasticsearchMetricQuery } from '@kbn/infra-plugin/server/lib/alerting/metric_threshold/lib/metric_query';
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
          const searchBody = getElasticsearchMetricQuery(getSearchParams(aggType), timeframe, 100);
          const result = await client.search({
            index,
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
          timeframe,
          100,
          undefined,
          '{"bool":{"should":[{"match_phrase":{"agent.hostname":"foo"}}],"minimum_should_match":1}}'
        );
        const result = await client.search({
          index,
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
            timeframe,
            100,
            'agent.id'
          );
          const result = await client.search({
            index,
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
          timeframe,
          100,
          'agent.id',
          '{"bool":{"should":[{"match_phrase":{"agent.hostname":"foo"}}],"minimum_should_match":1}}'
        );
        const result = await client.search({
          index,
          body: searchBody,
        });

        expect(result.hits).to.be.ok();
        expect(result.aggregations).to.be.ok();
      });
    });
  });
}
