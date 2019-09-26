/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import overviewFixture from './fixtures/overview';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('overview', () => {
    const archive = 'monitoring/singlecluster-yellow-platinum';
    const timeRange = {
      min: '2017-08-29T17:24:17.000Z',
      max: '2017-08-29T17:26:08.000Z'
    };

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should summarize kibana instances with stats', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/DFDDUmKHR0Ge0mkdYW2bew/kibana')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(overviewFixture);
    });
  });
}
