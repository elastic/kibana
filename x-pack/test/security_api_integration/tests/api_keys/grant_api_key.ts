/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esSupertest = getService('esSupertest');

  describe('Grant API keys', () => {
    async function validateApiKey(username: string, encodedApiKey: string) {
      const { body: user } = await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `ApiKey ${encodedApiKey}`)
        .expect(200);

      expect(user.username).to.eql(username);
      expect(user.authentication_provider).to.eql({ name: '__http__', type: 'http' });
      expect(user.authentication_type).to.eql('api_key');
    }

    it('should properly grant API key with `Basic` credentials', async function () {
      const credentials = Buffer.from(
        `${adminTestUser.username}:${adminTestUser.password}`
      ).toString('base64');

      const { body: apiKey } = await supertest
        .post('/api_keys/_grant')
        .set('Authorization', `Basic ${credentials}`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'my-basic-api-key' })
        .expect(200);
      expect(apiKey.name).to.eql('my-basic-api-key');

      await validateApiKey(adminTestUser.username, apiKey.encoded);
    });

    it('should properly grant API key with `Bearer` credentials', async function () {
      const { body: token } = await esSupertest
        .post('/_security/oauth2/token')
        .send({ grant_type: 'password', ...adminTestUser })
        .expect(200);

      const { body: apiKey } = await supertest
        .post('/api_keys/_grant')
        .set('Authorization', `Bearer ${token.access_token}`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'my-bearer-api-key' })
        .expect(200);
      expect(apiKey.name).to.eql('my-bearer-api-key');

      await validateApiKey(adminTestUser.username, apiKey.encoded);
    });

    describe('with JWT credentials', function () {
      // When we run tests on MKI, JWT realm is configured differently, and we cannot handcraft valid JWTs. We create
      // separate `describe` since `this.tags` only works on a test suite level.
      this.tags(['skipMKI']);

      it('should properly grant API key (with client authentication)', async function () {
        const jsonWebToken =
          'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2tpYmFuYS5lbGFzdGljLmNvL2p3dC8iLCJzdWIiOiJlbGFzdGljLWFnZW50IiwiYXVkIjoiZWxhc3RpY3NlYXJjaCIsIm5hbWUiOiJFbGFzdGljIEFnZW50IiwiaWF0Ijo5NDY2ODQ4MDAsImV4cCI6NDA3MDkwODgwMH0.P7RHKZlLskS5DfVRqoVO4ivoIq9rXl2-GW6hhC9NvTSkwphYivcjpTVcyENZvxTTvJJNqcyx6rF3T-7otTTIHBOZIMhZauc5dob-sqcN_mT2htqm3BpSdlJlz60TBq6diOtlNhV212gQCEJMPZj0MNj7kZRj_GsECrTaU7FU0A3HAzkbdx15vQJMKZiFbbQCVI7-X2J0bZzQKIWfMHD-VgHFwOe6nomT-jbYIXtCBDd6fNj1zTKRl-_uzjVqNK-h8YW1h6tE4xvZmXyHQ1-9yNKZIWC7iEaPkBLaBKQulLU5MvW3AtVDUhzm6--5H1J85JH5QhRrnKYRon7ZW5q1AQ';

        const { body: apiKey } = await supertest
          .post('/api_keys/_grant')
          .set('Authorization', `Bearer ${jsonWebToken}`)
          .set('ES-Client-Authentication', 'SharedSecret my_super_secret')
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'my-jwt-secret-api-key' })
          .expect(200);
        expect(apiKey.name).to.eql('my-jwt-secret-api-key');

        await validateApiKey('elastic-agent', apiKey.encoded);
      });

      it('should properly grant API key (without client authentication)', async function () {
        const jsonWebToken =
          'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2tpYmFuYS5lbGFzdGljLmNvL2p3dC9uby1zZWNyZXQiLCJzdWIiOiJlbGFzdGljLWFnZW50LW5vLXNlY3JldCIsImF1ZCI6ImVsYXN0aWNzZWFyY2giLCJuYW1lIjoiRWxhc3RpYyBBZ2VudCIsImlhdCI6OTQ2Njg0ODAwLCJleHAiOjQwNzA5MDg4MDB9.OZ_XIDqMmoWr8XqbWE9C04l1NYMsbGXG0zGPdztT-7PuZirzbSvm8z9T7SqbvsujUMn78vpeHx1HyBukrzrBXw2PKeVCa6PGPBtJ_m1fpsCffelHGAD3n2Mu3HanQmdmamHG6JbyLGUwWJ9F31M1xWFAtnMTqP0yeaDOw_9t0WVXHAedVNjvJIrz2X09GHpa9RXxSA0hDuzPotw41kzSrCOhsiBXTNUUNiv4BQ6LNmxbIS6XcXab6LxnQEKtu7XbziaokHKjdZpVAWG8GF8fu0i77GGszNE30RBonYUUPbBrBjhEueK7M8HXTwdHCalRMGsXqD8qS0-TGzii6G-4vg';

        const { body: apiKey } = await supertest
          .post('/api_keys/_grant')
          .set('Authorization', `Bearer ${jsonWebToken}`)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'my-jwt-api-key' })
          .expect(200);
        expect(apiKey.name).to.eql('my-jwt-api-key');

        await validateApiKey('elastic-agent-no-secret', apiKey.encoded);
      });
    });
  });
}
