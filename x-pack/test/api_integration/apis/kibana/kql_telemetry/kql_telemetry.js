/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertestNoAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('telemetry API', () => {
    before(() => esArchiver.load('x-pack/test/functional/es_archives/empty_kibana'));
    after(() => esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana'));

    describe('no auth', () => {
      it('should return 401', async () => {
        return supertestNoAuth
          .post('/api/kibana/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .set('kbn-xsrf', 'much access')
          .send({ opt_in: true })
          .expect(401);
      });
    });

    describe('with auth', () => {
      it('should return 200 for a successful request', async () => {
        return supertest
          .post('/api/kibana/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .set('kbn-xsrf', 'such token, wow')
          .send({ opt_in: true })
          .expect('Content-Type', /json/)
          .expect(200)
          .then(({ body }) => {
            expect(body.success).to.be(true);
          });
      });
    });
  });
}
