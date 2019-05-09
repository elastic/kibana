/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { first } from 'lodash';
import { DATES } from './constants';
import { MetricsExplorerResponse } from '../../../../plugins/infra/server/routes/metrics_explorer/types';
import { KbnTestProvider } from './types';

const { min, max } = DATES['7.0.0'].hosts;

const metricsExplorerTest: KbnTestProvider = ({ getService }) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('Metrics Explorer API', () => {
    before(() => esArchiver.load('infra/7.0.0/hosts'));
    after(() => esArchiver.unload('infra/7.0.0/hosts'));

    it('should work for multiple metrics', async () => {
      const postBody = {
        timerange: {
          field: '@timestamp',
          to: max,
          from: min,
          interval: '>=1m',
        },
        indexPattern: 'metricbeat-*',
        metrics: [
          {
            aggregation: 'avg',
            field: 'system.cpu.user.pct',
            rate: false,
          },
          {
            aggregation: 'count',
            rate: false,
          },
        ],
      };
      const response = await supertest
        .post('/api/infra/metrics_explorer')
        .set('kbn-xsrf', 'xxx')
        .send(postBody)
        .expect(200);
      const body: MetricsExplorerResponse = response.body;
      expect(body).to.have.property('series');
      expect(body.series).length(1);
      const firstSeries = first(body.series);
      expect(firstSeries).to.have.property('id', 'ALL');
      expect(firstSeries).to.have.property('columns');
      expect(firstSeries).to.have.property('rows');
      expect(firstSeries!.columns).to.eql([
        { name: 'timestamp', type: 'date' },
        { name: 'metric_0', type: 'number' },
        { name: 'metric_1', type: 'number' },
      ]);
      expect(firstSeries!.rows).to.have.length(9);
      expect(firstSeries!.rows![1]).to.eql({
        metric_0: 0.005333333333333333,
        metric_1: 131,
        timestamp: 1547571300000,
      });
    });

    it('should work with groupBy', async () => {
      const postBody = {
        timerange: {
          field: '@timestamp',
          to: max,
          from: min,
          interval: '>=1m',
        },
        indexPattern: 'metricbeat-*',
        groupBy: 'event.dataset',
        limit: 3,
        afterKey: 'system.cpu',
        metrics: [
          {
            aggregation: 'count',
            rate: false,
          },
        ],
      };
      const response = await supertest
        .post('/api/infra/metrics_explorer')
        .set('kbn-xsrf', 'xxx')
        .send(postBody)
        .expect(200);
      const body: MetricsExplorerResponse = response.body;
      expect(body).to.have.property('series');
      expect(body.series).length(3);
      const firstSeries = first(body.series);
      expect(firstSeries).to.have.property('id', 'system.diskio');
      expect(firstSeries).to.have.property('columns');
      expect(firstSeries).to.have.property('rows');
      expect(firstSeries!.columns).to.eql([
        { name: 'timestamp', type: 'date' },
        { name: 'metric_0', type: 'number' },
        { name: 'groupBy', type: 'string' },
      ]);
      expect(firstSeries!.rows).to.have.length(9);
      expect(firstSeries!.rows![1]).to.eql({
        groupBy: 'system.diskio',
        metric_0: 24,
        timestamp: 1547571300000,
      });
      expect(body).to.have.property('pageInfo');
      expect(body.pageInfo).to.eql({
        afterKey: 'system.fsstat',
        total: 12,
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default metricsExplorerTest;
