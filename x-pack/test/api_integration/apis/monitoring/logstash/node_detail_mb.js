/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import nodeDetailFixture from './fixtures/node_detail_8.json';
import nodeDetailAdvancedFixture from './fixtures/node_detail_advanced_8.json';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('node detail - metricbeat and package', () => {
    ['logstash_8', 'logstash_package'].forEach((source) => {
      describe(`node detail ${source}`, () => {
        const archive = `x-pack/test/api_integration/apis/monitoring/es_archives/${source}`;
        const timeRange = {
          min: '2022-06-17T13:19:00.000Z',
          max: '2022-06-17T13:25:00.000Z',
        };

        before('load archive', () => {
          return esArchiver.load(archive);
        });

        after('unload archive', () => {
          return esArchiver.unload(archive);
        });

        it('should summarize the Logstash node with non-advanced chart data metrics', async () => {
          const { body } = await supertest
            .post(
              '/api/monitoring/v1/clusters/__standalone_cluster__/logstash/node/f9efd237-3bbf-4a9b-9ce7-a16141b9d981'
            )
            .set('kbn-xsrf', 'xxx')
            .send({ timeRange, is_advanced: false })
            .expect(200);

          expect(body).to.eql(nodeDetailFixture);
        });

        it('should summarize the Logstash node with advanced chart data metrics', async () => {
          const { body } = await supertest
            .post(
              '/api/monitoring/v1/clusters/__standalone_cluster__/logstash/node/f9efd237-3bbf-4a9b-9ce7-a16141b9d981'
            )
            .set('kbn-xsrf', 'xxx')
            .send({ timeRange, is_advanced: true })
            .expect(200);

          expect(body).to.eql(nodeDetailAdvancedFixture);
        });
      });
    });
  });
}
