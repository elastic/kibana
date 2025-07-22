/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parse as parseCookie } from 'tough-cookie';

import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  const createSimpleUser = async () => {
    await es.security.putUser({
      username: 'simple_user',
      refresh: 'wait_for',
      password: 'changeme',
      roles: ['viewer'],
    });
  };

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

  const getSimpleUserProfile = async () => {
    const response = await es.security.activateUserProfile({
      username: 'simple_user',
      password: 'changeme',
      grant_type: 'password',
    });

    return {
      profileUid: response.uid,
    };
  };

  describe('read only saved objects', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
      await createSimpleUser();
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

    describe('transfer ownership of read only objects', () => {
      it('should transfer ownership of read only objects by owner', async () => {
        const { profileUid: simpleUserProfileUid } = await getSimpleUserProfile();

        const { cookie: testUserCookie, profileUid } = await loginAsTestUser();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;

        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        await supertestWithoutAuth
          .put('/read_only_objects/transfer')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
            newOwnerProfileUid: simpleUserProfileUid,
          })
          .expect(200);

        const getResponse = await supertestWithoutAuth
          .get(`/read_only_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .expect(200);
        expect(getResponse.body).to.have.property('accessControl');
        expect(getResponse.body.accessControl).to.have.property('owner', simpleUserProfileUid);
      });

      it('should throw when transferring ownership of object owned by a different user and not admin', async () => {
        const { profileUid: simpleUserProfileUid } = await getSimpleUserProfile();
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
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
            newOwnerProfileUid: simpleUserProfileUid,
          })
          .expect(403);

        expect(transferResponse.body).to.have.property('message');
        expect(transferResponse.body.message).to.contain(
          `Unable to manage_access_control for types read_only_type`
        );
      });

      it('should allow admins to transfer ownership of any object', async () => {
        const { profileUid: simpleUserProfileUid } = await getSimpleUserProfile();
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

        await supertestWithoutAuth
          .put('/read_only_objects/transfer')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
            newOwnerProfileUid: simpleUserProfileUid,
          })
          .expect(200);

        const getResponse = await supertestWithoutAuth
          .get(`/read_only_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(200);

        expect(getResponse.body.accessControl).to.have.property('owner', simpleUserProfileUid);
      });

      it('should allow bulk transfer ownership of allowed objects', async () => {
        const { profileUid: simpleUserProfileUid } = await getSimpleUserProfile();
        const { cookie: testUserCookie } = await loginAsTestUser();
        const { cookie: adminCookie } = await login(adminTestUser.username, adminTestUser.password);
        const firstCreate = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const firstObjectId = firstCreate.body.id;

        const secondCreate = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const secondObjectId = secondCreate.body.id;

        await supertestWithoutAuth
          .put('/read_only_objects/transfer')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({
            objects: [
              { id: firstObjectId, type: firstCreate.body.type },
              { id: secondObjectId, type: secondCreate.body.type },
            ],
            newOwnerProfileUid: simpleUserProfileUid,
          })
          .expect(200);
        {
          const getResponse = await supertestWithoutAuth
            .get(`/read_only_objects/${firstObjectId}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .expect(200);

          expect(getResponse.body.accessControl).to.have.property('owner', simpleUserProfileUid);
        }
        {
          const getResponse = await supertestWithoutAuth
            .get(`/read_only_objects/${secondObjectId}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .expect(200);
          expect(getResponse.body.accessControl).to.have.property('owner', simpleUserProfileUid);
        }
      });
    });

    describe('change access mode of read only objects', () => {
      it('should allow admins to change access mode of any object', async () => {
        const { cookie: testUserCookie, profileUid } = await loginAsTestUser();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: false })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);
        const { cookie: adminCookie } = await login(adminTestUser.username, adminTestUser.password);

        await supertestWithoutAuth
          .put('/read_only_objects/change_access_mode')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
            newAccessMode: 'read_only',
          })
          .expect(200);

        const getResponse = await supertestWithoutAuth
          .get(`/read_only_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(200);

        expect(getResponse.body.accessControl).to.have.property('accessMode', 'read_only');
      });

      it('allow owner to update post change access mode', async () => {
        const { cookie: testUserCookie, profileUid } = await loginAsTestUser();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: false })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);
        const { cookie: adminCookie } = await login(adminTestUser.username, adminTestUser.password);

        await supertestWithoutAuth
          .put('/read_only_objects/change_access_mode')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
            newAccessMode: 'read_only',
          })
          .expect(200);

        const getResponse = await supertestWithoutAuth
          .get(`/read_only_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(200);

        expect(getResponse.body.accessControl).to.have.property('accessMode', 'read_only');

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

      it('should throw when trying to make changes on locked objects', async () => {
        const { cookie: testUserCookie, profileUid } = await loginAsTestUser();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);
        await getSimpleUserProfile();
        const { cookie: simpleUserCookie } = await login('simple_user', 'changeme');

        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', simpleUserCookie.cookieString())
          .send({ objectId, type: 'read_only_type' })
          .expect(403);
        expect(updateResponse.body).to.have.property('message');
        expect(updateResponse.body.message).to.contain(`Unable to update read_only_type`);
      });

      it('allows updates on removing read only access mode', async () => {
        const { cookie: testUserCookie, profileUid } = await loginAsTestUser();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        await supertestWithoutAuth
          .put('/read_only_objects/change_access_mode')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
          })
          .expect(200);

        const { cookie: simpleUserCookie } = await login('simple_user', 'changeme');

        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', simpleUserCookie.cookieString())
          .send({ objectId, type: 'read_only_type' })
          .expect(200);
        expect(updateResponse.body.id).to.eql(objectId);
        expect(updateResponse.body.attributes).to.have.property(
          'description',
          'updated description'
        );
      });
    });
  });
}
