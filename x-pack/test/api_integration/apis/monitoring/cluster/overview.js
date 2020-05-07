/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import overviewFixture from './fixtures/overview';

export default function({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('overview', function() {
    // TODO: https://github.com/elastic/stack-monitoring/issues/31
    this.tags(['skipCloud']);

    describe('with trial license clusters', () => {
      const archive = 'monitoring/singlecluster-green-gold';
      const timeRange = {
        min: '2017-08-23T21:29:35Z',
        max: '2017-08-23T21:47:25Z',
      };
      const codePaths = ['all'];

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
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
}
