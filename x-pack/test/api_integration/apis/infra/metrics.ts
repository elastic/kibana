/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { first, last } from 'lodash';

import { metricsQuery } from '../../../../plugins/infra/public/containers/metrics/metrics.gql_query';
import { MetricsQuery } from '../../../../plugins/infra/public/graphql/types';
import { KbnTestProvider } from './types';

import { DATES } from './constants';
const { min, max } = DATES['7.0.0'].hosts;

const metricTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('metrics', () => {
    before(() => esArchiver.load('infra/7.0.0/hosts'));
    after(() => esArchiver.unload('infra/7.0.0/hosts'));

    it('should basically work', () => {
      return client
        .query<MetricsQuery.Query>({
          query: metricsQuery,
          variables: {
            sourceId: 'default',
            metrics: ['hostCpuUsage'],
            timerange: {
              to: max,
              from: min,
              interval: '>=1m',
            },
            nodeId: 'demo-stack-mysql-01',
            nodeType: 'host',
          },
        })
        .then(resp => {
          const { metrics } = resp.data.source;
          expect(metrics.length).to.equal(1);
          const metric = first(metrics);
          expect(metric).to.have.property('id', 'hostCpuUsage');
          expect(metric).to.have.property('series');
          const series = first(metric.series);
          expect(series).to.have.property('id', 'user');
          expect(series).to.have.property('data');
          const datapoint = last(series.data);
          expect(datapoint).to.have.property('timestamp', 1547571720000);
          expect(datapoint).to.have.property('value', 0.0018333333333333333);
        });
    });

    it('should support multiple metrics', () => {
      return client
        .query<MetricsQuery.Query>({
          query: metricsQuery,
          variables: {
            sourceId: 'default',
            metrics: ['hostCpuUsage', 'hostLoad'],
            timerange: {
              to: max,
              from: min,
              interval: '>=1m',
            },
            nodeId: 'demo-stack-mysql-01',
            nodeType: 'host',
          },
        })
        .then(resp => {
          const { metrics } = resp.data.source;
          expect(metrics.length).to.equal(2);
        });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default metricTests;
