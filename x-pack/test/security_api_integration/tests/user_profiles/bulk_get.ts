/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse as parseCookie, Cookie } from 'tough-cookie';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('Getting user profiles in bulk', () => {
    const usersSessions = new Map<string, { cookie: Cookie; uid: string }>();
    before(async () => {
      // 1. Create test users
      await Promise.all(
        ['one', 'two', 'three'].map((userPrefix) =>
          security.user.create(`user_${userPrefix}`, {
            password: 'changeme',
            roles: [`role_${userPrefix}`],
            full_name: userPrefix.toUpperCase(),
            email: `${userPrefix}@elastic.co`,
          })
        )
      );

      // 2. Activate user profiles (activation time affects the order in which Elasticsearch returns results, but the
      // `bulk_get` operation should always manually sort the results before returning them to the consumers, and the
      // activation order should not matter for these tests).
      await Promise.all(
        ['one', 'two', 'three'].map(async (userPrefix) => {
          const response = await supertestWithoutAuth
            .post('/internal/security/login')
            .set('kbn-xsrf', 'xxx')
            .send({
              providerType: 'basic',
              providerName: 'basic',
              currentURL: '/',
              params: { username: `user_${userPrefix}`, password: 'changeme' },
            })
            .expect(200);

          const cookie = parseCookie(response.headers['set-cookie'][0])!;
          const { body: profile } = await supertestWithoutAuth
            .get('/internal/security/user_profile')
            .set('Cookie', cookie.cookieString())
            .expect(200);

          usersSessions.set(`user_${userPrefix}`, { cookie, uid: profile.uid });
        })
      );
    });

    after(async () => {
      await Promise.all(
        ['one', 'two', 'three'].map((userPrefix) => security.user.delete(`user_${userPrefix}`))
      );
    });

    it('can get multiple profiles', async () => {
      const profiles = await supertest
        .post('/internal/security/user_profile/_bulk_get')
        .set('kbn-xsrf', 'xxx')
        .send({ uids: [usersSessions.get('user_one')!.uid, usersSessions.get('user_two')!.uid] })
        .expect(200);
      expect(profiles.body).to.have.length(2);
      expectSnapshot(
        profiles.body.map(({ user, data }: { user: unknown; data: unknown }) => ({ user, data }))
      ).toMatchInline(`
        Array [
          Object {
            "data": Object {},
            "user": Object {
              "email": "one@elastic.co",
              "full_name": "ONE",
              "username": "user_one",
            },
          },
          Object {
            "data": Object {},
            "user": Object {
              "email": "two@elastic.co",
              "full_name": "TWO",
              "username": "user_two",
            },
          },
        ]
      `);
    });

    it('can get multiple profiles with data', async () => {
      // 1. Update user profile data.
      await Promise.all(
        ['one', 'two'].map((userPrefix) =>
          supertestWithoutAuth
            .post('/internal/security/user_profile/_data')
            .set('kbn-xsrf', 'xxx')
            .set('Cookie', usersSessions.get(`user_${userPrefix}`)!.cookie.cookieString())
            .send({ some: `data-${userPrefix}` })
            .expect(200)
        )
      );

      // 2. Data is not returned by default
      let profiles = await supertest
        .post('/internal/security/user_profile/_bulk_get')
        .set('kbn-xsrf', 'xxx')
        .send({ uids: [usersSessions.get('user_one')!.uid, usersSessions.get('user_two')!.uid] })
        .expect(200);
      expect(profiles.body).to.have.length(2);
      expectSnapshot(
        profiles.body.map(({ user, data }: { user: unknown; data: unknown }) => ({ user, data }))
      ).toMatchInline(`
        Array [
          Object {
            "data": Object {},
            "user": Object {
              "email": "one@elastic.co",
              "full_name": "ONE",
              "username": "user_one",
            },
          },
          Object {
            "data": Object {},
            "user": Object {
              "email": "two@elastic.co",
              "full_name": "TWO",
              "username": "user_two",
            },
          },
        ]
      `);

      // 3. Only specific data is returned if requested.
      profiles = await supertest
        .post('/internal/security/user_profile/_bulk_get')
        .set('kbn-xsrf', 'xxx')
        .send({
          uids: [usersSessions.get('user_one')!.uid, usersSessions.get('user_two')!.uid],
          dataPath: 'some',
        })
        .expect(200);
      expect(profiles.body).to.have.length(2);
      expectSnapshot(
        profiles.body.map(({ user, data }: { user: unknown; data: unknown }) => ({ user, data }))
      ).toMatchInline(`
        Array [
          Object {
            "data": Object {
              "some": "data-one",
            },
            "user": Object {
              "email": "one@elastic.co",
              "full_name": "ONE",
              "username": "user_one",
            },
          },
          Object {
            "data": Object {
              "some": "data-two",
            },
            "user": Object {
              "email": "two@elastic.co",
              "full_name": "TWO",
              "username": "user_two",
            },
          },
        ]
      `);
    });
  });
}
