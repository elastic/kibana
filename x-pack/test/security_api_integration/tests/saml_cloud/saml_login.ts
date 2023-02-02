/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse as parseCookie, Cookie } from 'tough-cookie';
import { getSAMLResponse } from '../../fixtures/saml/saml_tools';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const randomness = getService('randomness');
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');

  const kibanaServerConfig = config.get('servers.kibana');

  function createSAMLResponse(options = {}) {
    return getSAMLResponse({
      destination: `http://localhost:${kibanaServerConfig.port}/api/security/saml/callback`,
      sessionIndex: String(randomness.naturalNumber()),
      ...options,
    });
  }

  async function checkSessionCookie(sessionCookie: Cookie, username = 'a@b.c') {
    const apiResponse = await supertest
      .get('/internal/security/me')
      .set('kbn-xsrf', 'xxx')
      .set('Cookie', sessionCookie.cookieString())
      .expect(200);

    expect(apiResponse.body.username).to.be(username);
    expect(apiResponse.body.elastic_cloud_user).to.be(true);
    expect(apiResponse.body.authentication_realm).to.eql({
      type: 'saml',
      name: 'cloud-saml-kibana',
    });
    expect(apiResponse.body.authentication_provider).to.eql({
      type: 'saml',
      name: 'cloud-saml-kibana',
    });
    expect(apiResponse.body.authentication_type).to.be('token');
  }

  describe('Cloud SAML authentication', () => {
    let sessionCookie: Cookie;

    beforeEach(async () => {
      // Cloud SAML relies on IdP initiated login.
      const samlAuthenticationResponse = await supertest
        .post('/api/security/saml/callback')
        .send({ SAMLResponse: await createSAMLResponse({ username: 'a@b.c' }) })
        .expect(302);

      expect(samlAuthenticationResponse.headers.location).to.be('/');

      sessionCookie = parseCookie(samlAuthenticationResponse.headers['set-cookie'][0])!;
    });

    it('should properly set `elastic_cloud_user` user property', async () => {
      // Same user, same provider - session ID hasn't changed and cookie should still be valid.
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .expect(200);

      // Check that all properties of the cloud saml user are properly set.
      await checkSessionCookie(sessionCookie);
    });
  });
}
