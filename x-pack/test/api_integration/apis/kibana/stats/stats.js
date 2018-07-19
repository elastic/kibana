/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService }) {
  const supertestNoAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('/api/stats', () => {
    describe('operational stats and usage stats', () => {
      before('load clusters archive', () => {
        return esArchiver.load('discover');
      });

      after('unload clusters archive', () => {
        return esArchiver.unload('discover');
      });

      describe('no auth', () => {
        it('should return 200 and stats for no extended', async () => {
          const { body } = await supertestNoAuth
            .get('/api/stats')
            .expect(200);
          expect(body.kibana.uuid).to.eql('5b2de169-2785-441b-ae8c-186a1936b17d');
          expect(body.process.uptime_ms).to.be.greaterThan(0);
          expect(body.os.uptime_ms).to.be.greaterThan(0);
          expect(body.usage).to.be(undefined);
        });

        it('should return 401 for extended', async () => {
          await supertestNoAuth
            .get('/api/stats?extended')
            .expect(401); // unauthorized
        });
      });

      describe('with auth', () => {
        it('should return 200 and stats for no extended', async () => {
          const { body } = await supertest
            .get('/api/stats')
            .expect(200);
          expect(body.kibana.uuid).to.eql('5b2de169-2785-441b-ae8c-186a1936b17d');
          expect(body.process.uptime_ms).to.be.greaterThan(0);
          expect(body.os.uptime_ms).to.be.greaterThan(0);
        });

        it('should return 200 for extended', async () => {
          const { body } = await supertest
            .get('/api/stats?extended')
            .expect(200);
          expect(body.kibana.uuid).to.eql('5b2de169-2785-441b-ae8c-186a1936b17d');
          expect(body.process.uptime_ms).to.be.greaterThan(0);
          expect(body.os.uptime_ms).to.be.greaterThan(0);
          expect(body.usage.kibana.index).to.be('.kibana');
          expect(body.usage.kibana.dashboard.total).to.be(0);
        });
      });
    });
  });
}
