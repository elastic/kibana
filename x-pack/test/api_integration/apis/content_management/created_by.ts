/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse as parseCookie } from 'tough-cookie';
import { FtrProviderContext } from '../../ftr_provider_context';

const sampleDashboard = {
  contentTypeId: 'dashboard',
  data: {
    kibanaSavedObjectMeta: {},
    title: 'Sample dashboard',
  },
  options: {
    references: [],
    overwrite: true,
  },
  version: 2,
};

export default function ({ getService }: FtrProviderContext) {
  describe('created_by', function () {
    describe('for not interactive user', function () {
      const supertest = getService('supertest');
      it('created_by is empty', async () => {
        const { body, status } = await supertest
          .post('/api/content_management/rpc/create')
          .set('kbn-xsrf', 'true')
          .send(sampleDashboard);

        expect(status).to.be(200);
        expect(body.result.result.item).to.be.ok();
        expect(body.result.result.item).to.not.have.key('createdBy');
      });
    });

    describe('for interactive user', function () {
      const supertest = getService('supertestWithoutAuth');
      const config = getService('config');
      let sessionHeaders: { [key: string]: string } = {};

      before(async () => {
        const username = config.get('servers.kibana.username');
        const password = config.get('servers.kibana.password');
        const response = await supertest
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'basic',
            providerName: 'basic',
            currentURL: '/',
            params: { username, password },
          })
          .expect(200);
        const cookie = parseCookie(response.header['set-cookie'][0])!.cookieString();
        sessionHeaders = { Cookie: cookie };
      });

      it('created_by is with profile_id', async () => {
        const createResponse = await supertest
          .post('/api/content_management/rpc/create')
          .set(sessionHeaders)
          .set('kbn-xsrf', 'true')
          .send(sampleDashboard);

        expect(createResponse.status).to.be(200);
        expect(createResponse.body.result.result.item).to.be.ok();
        expect(createResponse.body.result.result.item).to.have.key('createdBy');
      });
    });
  });
}
