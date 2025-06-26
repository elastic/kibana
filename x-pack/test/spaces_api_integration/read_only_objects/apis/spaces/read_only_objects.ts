/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parse as parseCookie } from 'tough-cookie';

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
    return {
      cookie: parseCookie(response.headers['set-cookie'][0])!,
      profileUid: response.body.profile_uid,
    };
  };

  const loginAsTestUser = async () => {
    const { cookie: testUserCookie, profileUid } = await login('test_user', 'changeme');
    return {
      cookie: testUserCookie,
      profileUid,
    };
  };

  describe('read only saved objects', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
    });
    after(async () => {
      // await security.testUser.restoreDefaults();
    });
    describe('create and access read only objects', () => {
      it('should create a read only object', async () => {
        const { cookie: adminCookie, profileUid } = await login(
          adminTestUser.username,
          adminTestUser.password
        );
        const response = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        expect(response.body.type).to.eql('read_only_type');
        expect(response.body).to.have.property('accessControl');
        expect(response.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(response.body.accessControl).to.have.property('owner', profileUid);
      });

      it('should throw when trying to create read only object with no user', async () => {
        await supertest
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(400);
      });

      it('should update read only objects owned by the same user', async () => {
        const { cookie: testUserCookie, profileUid } = await loginAsTestUser();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ objectId, type: 'read_only_type' })
          .expect(200);
        expect(updateResponse.body.id).to.eql(objectId);
        expect(updateResponse.body.attributes).to.have.property(
          'description',
          'updated description'
        );
      });

      it('should throw when updating read only objects owned by a different user when not admin', async () => {
        const { cookie: adminCookie, profileUid: adminProfileUid } = await login(
          adminTestUser.username,
          adminTestUser.password
        );
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileUid);

        const { cookie: testUserCookie } = await loginAsTestUser();
        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ objectId, type: 'read_only_type' })
          .expect(403);
        expect(updateResponse.body).to.have.property('message');
        expect(updateResponse.body.message).to.contain('Unable to update read_only_type');
      });
    });

    describe.only('transfer ownership of read only objects', () => {
      it('should transfer ownership of read only objects by owner', async () => {
        const { cookie: testUserCookie, profileUid } = await loginAsTestUser();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const transferResponse = await supertestWithoutAuth
          .put('/read_only_objects/transfer')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ objectId, type: 'read_only_type', newOwner: 'new_owner' })
          .expect(200);
        expect(transferResponse.body.accessControl).to.have.property('owner', 'new_owner');
      });

      it('should throw when transferring ownership of object owned by a different user and not admin', async () => {
        const { cookie: adminCookie, profileUid: adminProfileUid } = await login(
          adminTestUser.username,
          adminTestUser.password
        );
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileUid);

        const { cookie: testUserCookie } = await loginAsTestUser();
        const transferResponse = await supertestWithoutAuth
          .put('/read_only_objects/transfer')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ objectId, type: 'read_only_type', newOwner: 'new_owner' })
          .expect(403);
        expect(transferResponse.body).to.have.property('message');
        expect(transferResponse.body.message).to.contain('Unable to update read_only_type');
      });

      it('should allow admins to transfer ownership of any object', async () => {
        const { cookie: testUserCookie, profileUid } = await loginAsTestUser();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const { cookie: adminCookie } = await login(adminTestUser.username, adminTestUser.password);
        const transferResponse = await supertestWithoutAuth
          .put('/read_only_objects/transfer')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ objectId, type: 'read_only_type', newOwner: 'new_owner' })
          .expect(200);
        expect(transferResponse.body.accessControl).to.have.property('owner', 'new_owner');
      });
    });
  });
}
