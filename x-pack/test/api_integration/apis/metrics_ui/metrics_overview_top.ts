/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  TopNodesRequestRT,
  TopNodesResponseRT,
} from '@kbn/infra-plugin/common/http_api/overview_api';
import { decodeOrThrow } from '@kbn/infra-plugin/common/runtime_types';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('API /metrics/overview/top', () => {
    before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/7.0.0/hosts'));
    after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/7.0.0/hosts'));

    it('works', async () => {
      const { min, max } = DATES['7.0.0'].hosts;
      const response = await supertest
        .post('/api/metrics/overview/top')
        .set({
          'kbn-xsrf': 'some-xsrf-token',
        })
        .send(
          TopNodesRequestRT.encode({
            sourceId: 'default',
            bucketSize: '300s',
            size: 5,
            timerange: {
              from: min,
              to: max,
            },
          })
        )
        .expect(200);

      const { series } = decodeOrThrow(TopNodesResponseRT)(response.body);

      expect(series.length).to.be(1);
      expect(series[0].id).to.be('demo-stack-mysql-01');
      expect(series[0].timeseries[1].timestamp - series[0].timeseries[0].timestamp).to.be(300_000);
    });

    describe('Runtime fields calculation', () => {
      before(() =>
        esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/hosts_and_network')
      );
      after(() =>
        esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/hosts_and_network')
      );

      it('should return correct sorted calculations', async () => {
        const { min, max } = DATES['8.0.0'].hosts_and_netowrk;
        const response = await supertest
          .post('/api/metrics/overview/top')
          .set({
            'kbn-xsrf': 'some-xsrf-token',
          })
          .send(
            TopNodesRequestRT.encode({
              sourceId: 'default',
              bucketSize: '300s',
              size: 5,
              timerange: {
                from: min,
                to: max,
              },
              sort: 'rx',
              sortDirection: 'asc',
            })
          )
          .expect(200);
        const { series } = decodeOrThrow(TopNodesResponseRT)(response.body);

        const hosts = series.map((s) => ({
          name: s.name,
          rx: s.rx,
          tx: s.tx,
        }));

        expect(hosts.length).to.be(3);
        expect(hosts[0]).to.eql({ name: 'metricbeat-2', rx: 8000, tx: 16860 });
        expect(hosts[1]).to.eql({ name: 'metricbeat-1', rx: 11250, tx: 25290.5 });
        expect(hosts[2]).to.eql({ name: 'metricbeat-3', rx: null, tx: null });
      });
    });
  });
}
