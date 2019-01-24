/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { first, last } from 'lodash';

import { metricsQuery } from '../../../../plugins/infra/public/containers/metrics/metrics.gql_query';
import { MetricsQuery } from '../../../../plugins/infra/public/graphql/types';
import { KbnTestProvider } from './types';

const metricTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('metrics', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));

    it('should basically work', () => {
      return client
        .query<MetricsQuery.Query>({
          query: metricsQuery,
          variables: {
            sourceId: 'default',
            metrics: ['hostCpuUsage'],
            timerange: {
              to: 1539806283952,
              from: 1539805341208,
              interval: '>=1m',
            },
            nodeId: 'demo-stack-nginx-01',
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
          expect(datapoint).to.have.property('timestamp', 1539806220000);
          expect(datapoint).to.have.property('value', 0.0065);
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
              to: 1539806283952,
              from: 1539805341208,
              interval: '>=1m',
            },
            nodeId: 'demo-stack-nginx-01',
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

// tslint:disable-next-line no-default-export
export default metricTests;
