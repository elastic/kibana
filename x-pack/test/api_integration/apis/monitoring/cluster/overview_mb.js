/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import overviewFixture from './fixtures/overview.json';
import { getLifecycleMethods } from '../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const { setup, tearDown } = getLifecycleMethods(getService);

  describe('overview - metricbeat and package', function () {
    ['mb', 'package'].forEach((source) => {
      describe(`overview ${source}`, function () {
        // TODO: https://github.com/elastic/stack-monitoring/issues/31
        this.tags(['skipCloud']);

        const archive = `x-pack/test/functional/es_archives/monitoring/singlecluster_green_gold_${source}`;

        describe('with trial license clusters', () => {
          const timeRange = {
            min: '2017-08-23T21:29:35Z',
            max: '2017-08-23T21:47:25Z',
          };
          const codePaths = ['all'];

          before('load clusters archive', () => {
            return setup(archive);
          });

          after('unload clusters archive', () => {
            return tearDown(archive);
          });

          it('should load multiple clusters', async () => {
            const { body } = await supertest
              .post('/api/monitoring/v1/clusters/y1qOsQPiRrGtmdEuM3APJw')
              .set('kbn-xsrf', 'xxx')
              .send({ timeRange, codePaths })
              .expect(200);
            expect(body).to.eql(overviewFixture);
          });
        });
      });
    });
  });
}
