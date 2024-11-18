/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import { adminTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');

  const jsonWebTokenRequiresSecret =
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2tpYmFuYS5lbGFzdGljLmNvL2p3dC8iLCJzdWIiOiJlbGFzdGljLWFnZW50IiwiYXVkIjoiZWxhc3RpY3NlYXJjaCIsIm5hbWUiOiJFbGFzdGljIEFnZW50IiwiaWF0Ijo5NDY2ODQ4MDAsImV4cCI6NDA3MDkwODgwMH0.P7RHKZlLskS5DfVRqoVO4ivoIq9rXl2-GW6hhC9NvTSkwphYivcjpTVcyENZvxTTvJJNqcyx6rF3T-7otTTIHBOZIMhZauc5dob-sqcN_mT2htqm3BpSdlJlz60TBq6diOtlNhV212gQCEJMPZj0MNj7kZRj_GsECrTaU7FU0A3HAzkbdx15vQJMKZiFbbQCVI7-X2J0bZzQKIWfMHD-VgHFwOe6nomT-jbYIXtCBDd6fNj1zTKRl-_uzjVqNK-h8YW1h6tE4xvZmXyHQ1-9yNKZIWC7iEaPkBLaBKQulLU5MvW3AtVDUhzm6--5H1J85JH5QhRrnKYRon7ZW5q1AQ';
  const jsonWebToken =
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2tpYmFuYS5lbGFzdGljLmNvL2p3dC9uby1zZWNyZXQiLCJzdWIiOiJlbGFzdGljLWFnZW50LW5vLXNlY3JldCIsImF1ZCI6ImVsYXN0aWNzZWFyY2giLCJuYW1lIjoiRWxhc3RpYyBBZ2VudCIsImlhdCI6OTQ2Njg0ODAwLCJleHAiOjQwNzA5MDg4MDB9.OZ_XIDqMmoWr8XqbWE9C04l1NYMsbGXG0zGPdztT-7PuZirzbSvm8z9T7SqbvsujUMn78vpeHx1HyBukrzrBXw2PKeVCa6PGPBtJ_m1fpsCffelHGAD3n2Mu3HanQmdmamHG6JbyLGUwWJ9F31M1xWFAtnMTqP0yeaDOw_9t0WVXHAedVNjvJIrz2X09GHpa9RXxSA0hDuzPotw41kzSrCOhsiBXTNUUNiv4BQ6LNmxbIS6XcXab6LxnQEKtu7XbziaokHKjdZpVAWG8GF8fu0i77GGszNE30RBonYUUPbBrBjhEueK7M8HXTwdHCalRMGsXqD8qS0-TGzii6G-4vg';
  const jsonWebTokenInvalidIssuer =
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2tpYmFuYS5lbGFzdGljLmNvL2p3dC9pbnZhbGlkIiwic3ViIjoiZWxhc3RpYy1hZ2VudCIsImF1ZCI6ImVsYXN0aWNzZWFyY2giLCJuYW1lIjoiRWxhc3RpYyBBZ2VudCIsImlhdCI6OTQ2Njg0ODAwLCJleHAiOjQwNzA5MDg4MDB9.XIbQM1tGanl039fNBR41FJ-GB4ZEHWWu8AYAqar_26Jje2BOt3yAVEERvbo1KcE6C20UdU1EgtXeQcwI6Bx6yi3KVkq7sRRygkq2j33lP_ZD3CfzZPiMwpIL5vOvf9J_DjUIZOhz1aqx4HYlBYkbK7xjE3gYeEvvVFAYFu2PNbtHmI-p3BAOpeCwbuogDzaSxUaUpAylBS2AJx8HCgSliKsDEwB3ICfyEawsyM7UYoDJutCjcYyP8jtGDVr_RgOaHBrwty0BsqJldmsHfkx86oUJZiO2cpMjo-lDmQgNhyFktFmnDTcBhN3jWbCJgi2FUmUU0dm4e3arzqU2xYyZiA';

  function assertUser(user: AuthenticatedUser, username: string, realmType = 'jwt') {
    expect(user.username).to.eql(username);
    expect(user.authentication_provider).to.eql({ name: '__http__', type: 'http' });
    expect(user.authentication_realm.type).to.eql(realmType);
  }

  describe('jwt', function () {
    // When we run tests on MKI, JWT realm is configured differently, and we cannot handcraft valid JWTs. We create
    // separate `describe` since `this.tags` only works on a test suite level.
    this.tags(['skipMKI']);

    it('accepts valid JWT (with secret) via authorization Bearer header', async () => {
      const { body: user } = await supertest
        .get('/internal/security/me')
        .set('authorization', `Bearer ${jsonWebTokenRequiresSecret}`)
        .set('ES-Client-Authentication', 'SharedSecret my_super_secret')
        .expect(200);

      assertUser(user, 'elastic-agent');
    });

    it('accepts valid JWT (without secret) via authorization Bearer header', async () => {
      const { body: user } = await supertest
        .get('/internal/security/me')
        .set('authorization', `Bearer ${jsonWebToken}`)
        .expect(200);

      assertUser(user, 'elastic-agent-no-secret');
    });

    it('accepts valid JWT and non-JWT tokens that do not require secret but the secret was supplied', async () => {
      const { body: user } = await supertest
        .get('/internal/security/me')
        .set('authorization', `Bearer ${jsonWebToken}`)
        .set('ES-Client-Authentication', 'SharedSecret my_super_secret')
        .expect(200);
      assertUser(user, 'elastic-agent-no-secret');

      const { access_token: accessToken } = await es.security.getToken({
        body: { grant_type: 'password', ...adminTestUser },
      });
      const { body: accessTokenUser } = await supertest
        .get('/internal/security/me')
        .set('authorization', `Bearer ${accessToken}`)
        .set('ES-Client-Authentication', 'SharedSecret my_super_secret')
        .expect(200);
      assertUser(accessTokenUser, adminTestUser.username, 'reserved');
    });

    it('rejects invalid JWT', async () => {
      await supertest
        .get('/internal/security/me')
        .set('authorization', `Bearer _${jsonWebTokenRequiresSecret}`)
        .set('ES-Client-Authentication', 'SharedSecret my_super_secret')
        .expect(401);

      await supertest
        .get('/internal/security/me')
        .set('authorization', `Bearer _${jsonWebToken}`)
        .expect(401);

      await supertest
        .get('/internal/security/me')
        .set('authorization', `Bearer ${jsonWebTokenInvalidIssuer}`)
        .expect(401);
    });

    it('rejects invalid JWT secret', async () => {
      await supertest
        .get('/internal/security/me')
        .set('authorization', `Bearer ${jsonWebTokenRequiresSecret}`)
        .set('ES-Client-Authentication', 'SharedSecret my_wrong_secret')
        .expect(401);

      await supertest
        .get('/internal/security/me')
        .set('authorization', `Bearer ${jsonWebTokenRequiresSecret}`)
        .set('ES-Client-Authentication', 'PrivateSecret my_super_secret')
        .expect(401);

      await supertest
        .get('/internal/security/me')
        .set('authorization', `Bearer ${jsonWebTokenRequiresSecret}`)
        .set('ES-Client-Authentication', 'SharedSecret_my_super_secret')
        .expect(401);
    });

    it('rejects JWT with required, but missing secret', async () => {
      await supertest
        .get('/internal/security/me')
        .set('authorization', `Bearer ${jsonWebTokenRequiresSecret}`)
        .expect(401);
    });
  });
}
