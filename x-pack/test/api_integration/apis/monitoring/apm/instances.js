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
    const archive = 'monitoring/apm';
    const timeRange = {
      min: '2018-08-31T12:59:49.104Z',
      max: '2018-08-31T13:59:49.104Z',
    };

    before('load clusters archive', () => {
      return esArchiver.load(archive);
    });

    after('unload clusters archive', () => {
      return esArchiver.unload(archive);
    });

    it('should load multiple clusters', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/GUtE4UwgSR-XUICRDEFKkA/apm/instances')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      const expected = {
        stats: {
          totalEvents: 18,
          apms: {
            total: 2,
          },
          timeOfLastEvent: '2018-08-31T13:59:21.201Z',
        },
        apms: [
          {
            uuid: '55f1089b-43b1-472a-919a-344667bae595',
            name: 'd06490170f2b',
            type: 'Apm-server',
            output: 'Elasticsearch',
            total_events_rate: 0.0033333333333333335,
            bytes_sent_rate: 5.7316666666666665,
            errors: 0,
            memory: 3445920,
            version: '7.0.0-alpha1',
            time_of_last_event: '2018-08-31T13:59:21.201Z',
          },
          {
            uuid: '9b16f434-2092-4983-a401-80a2b61c79d6',
            name: '01323afae1fb',
            type: 'Apm-server',
            output: 'Elasticsearch',
            total_events_rate: 0.0016666666666666668,
            bytes_sent_rate: 2.9105555555555553,
            errors: 0,
            memory: 3087640,
            version: '7.0.0-alpha1',
            time_of_last_event: '2018-08-31T13:59:21.165Z',
          },
        ],
      };

      expect(body).to.eql(expected);
    });
  });
}
