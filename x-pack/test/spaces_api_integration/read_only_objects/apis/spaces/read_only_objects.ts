/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type Cookie, parse as parseCookie } from 'tough-cookie';

import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  const login = async (username: string, password: string | undefined) => {
    const response = await supertestWithoutAuth
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({
        providerType: 'basic',
        providerName: 'basic1',
        currentURL: '/',
        params: { username, password },
      })
      .expect(200);
    return parseCookie(response.headers['set-cookie'][0])!;
  };

  const createObject = async (type: string, isReadOnly: boolean, cookie: Cookie) => {
    return supertest
      .post('/read_only_objects/create')
      .set('kbn-xsrf', 'true')
      .set('Cookie', cookie.cookieString())
      .send({ type, isReadOnly })
      .expect(200);
  };

  describe('read only saved objects', () => {
    after(async () => {
      await security.testUser.restoreDefaults();
    });
    describe('create and access read only objects', () => {
      it.only('should create a read only object', async () => {
        const adminCookie = await login(adminTestUser.username, adminTestUser.username);
        const response = await createObject('read_only_type', true, adminCookie);
        console.log(response.body);
        expect(response.body.type).to.eql('read_only_type');
        expect(response.body).to.have.property('accessControl');
        expect(response.body.accessControl).to.have.property('readOnly', true);
        expect(response.body.accessControl).to.have.property('owner');
      });

      it('should update read only objects owned by the same user', async () => {
        const getResponse = await createObject('read_only_type', true);
        const objectId = getResponse.body.id;

        expect(getResponse.body.attributes).to.have.property('description', 'test');

        await supertest
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .send({ objectId, type: getResponse.body.type })
          .expect(200)
          .then((response) => {
            expect(response.body.type).to.be('read_only_type');
            expect(response.body.id).to.be(objectId);
          });
      });

      it('should throw when updating read only objects owned by a different user when not admin', async () => {
        await security.testUser.setRoles(['kibana_savedobjects_editor']);
        const getResponse = await createObject('read_only_type', true);
        const objectId = getResponse.body.id;

        expect(getResponse.body.attributes).to.have.property('description', 'test');

        await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'xxx')
          .auth('test_user', 'changeme')
          .send({ objectId, type: getResponse.body.type })
          .expect(403);
      });
    });
  });
}
