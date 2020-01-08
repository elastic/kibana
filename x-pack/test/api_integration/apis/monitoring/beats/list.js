/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('list', () => {
    describe('with restarted beat instance', () => {
      const archive = 'monitoring/beats-with-restarted-instance';
      const timeRange = {
        min: '2018-02-09T20:49:00Z',
        max: '2018-02-09T21:50:00Z',
      };

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should load multiple clusters', async () => {
        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/fHJwISmKTFO8bj57oFBLUQ/beats/beats')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange })
          .expect(200);

        const expected = {
          stats: {
            total: 2,
            types: [
              { type: 'Metricbeat', count: 1 },
              { type: 'Filebeat', count: 1 },
            ],
            stats: { totalEvents: 12829, bytesSent: 2040312125 },
          },
          listing: [
            {
              uuid: '2736e08b-5830-409b-8169-32aac39c5e55',
              name: 'spicy.local',
              type: 'Filebeat',
              output: 'Elasticsearch',
              total_events_rate: 0.018032786885245903,
              bytes_sent_rate: 24135.450546448086,
              errors: 0,
              memory: 30680648,
              version: '7.0.0-alpha1',
            },
            {
              uuid: '60599a4f-8139-4251-b0b9-15866df34221',
              name: 'spicy.local',
              type: 'Metricbeat',
              output: 'Elasticsearch',
              total_events_rate: 3.1327868852459018,
              bytes_sent_rate: 2613.3185792349727,
              errors: 0,
              memory: 7598304,
              version: '7.0.0-alpha1',
            },
          ],
        };
        expect(body).to.eql(expected);
      });
    });
  });
}
