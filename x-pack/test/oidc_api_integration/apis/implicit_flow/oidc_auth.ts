/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { JSDOM } from 'jsdom';
import request, { Cookie } from 'request';
import { format as formatURL } from 'url';
import { createTokens, getStateAndNonce } from '../../fixtures/oidc_tools';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');

  describe('OpenID Connect Implicit Flow authentication', () => {
    describe('finishing handshake', () => {
      let stateAndNonce: ReturnType<typeof getStateAndNonce>;
      let handshakeCookie: Cookie;

      beforeEach(async () => {
        const handshakeResponse = await supertest
          .get('/abc/xyz/handshake?one=two three')
          .expect(302);

        handshakeCookie = request.cookie(handshakeResponse.headers['set-cookie'][0])!;
        stateAndNonce = getStateAndNonce(handshakeResponse.headers.location);
      });

      it('should return an HTML page that will parse URL fragment', async () => {
        const response = await supertest.get('/api/security/v1/oidc/implicit').expect(200);
        const dom = new JSDOM(response.text, {
          url: formatURL({ ...config.get('servers.kibana'), auth: false }),
          runScripts: 'dangerously',
          resources: 'usable',
          beforeParse(window) {
            // JSDOM doesn't support changing of `window.location` and throws an exception if script
            // tries to do that and we have to workaround this behaviour. We also need to wait until our
            // script is loaded and executed, __isScriptExecuted__ is used exactly for that.
            (window as Record<string, any>).__isScriptExecuted__ = new Promise(resolve => {
              Object.defineProperty(window, 'location', {
                value: {
                  href:
                    'https://kibana.com/api/security/v1/oidc/implicit#token=some_token&access_token=some_access_token',
                  replace(newLocation: string) {
                    this.href = newLocation;
                    resolve();
                  },
                },
              });
            });
          },
        });

        await (dom.window as Record<string, any>).__isScriptExecuted__;

        // Check that proxy page is returned with proper headers.
        expect(response.headers['content-type']).to.be('text/html; charset=utf-8');
        expect(response.headers['cache-control']).to.be('private, no-cache, no-store');
        expect(response.headers['content-security-policy']).to.be(
          `script-src 'unsafe-eval' 'self'; worker-src blob: 'self'; style-src 'unsafe-inline' 'self'`
        );

        // Check that script that forwards URL fragment worked correctly.
        expect(dom.window.location.href).to.be(
          '/api/security/v1/oidc?authenticationResponseURI=https%3A%2F%2Fkibana.com%2Fapi%2Fsecurity%2Fv1%2Foidc%2Fimplicit%23token%3Dsome_token%26access_token%3Dsome_access_token'
        );
      });

      it('should fail if OpenID Connect response is not complemented with handshake cookie', async () => {
        const { idToken, accessToken } = createTokens('1', stateAndNonce.nonce);
        const authenticationResponse = `https://kibana.com/api/security/v1/oidc/implicit#id_token=${idToken}&state=${stateAndNonce.state}&token_type=bearer&access_token=${accessToken}`;

        await supertest
          .get(
            `/api/security/v1/oidc?authenticationResponseURI=${encodeURIComponent(
              authenticationResponse
            )}`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(401);
      });

      it('should fail if state is not matching', async () => {
        const { idToken, accessToken } = createTokens('1', stateAndNonce.nonce);
        const authenticationResponse = `https://kibana.com/api/security/v1/oidc/implicit#id_token=${idToken}&state=$someothervalue&token_type=bearer&access_token=${accessToken}`;

        await supertest
          .get(
            `/api/security/v1/oidc?authenticationResponseURI=${encodeURIComponent(
              authenticationResponse
            )}`
          )
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .expect(401);
      });

      // FLAKY: https://github.com/elastic/kibana/issues/43938
      it.skip('should succeed if both the OpenID Connect response and the cookie are provided', async () => {
        const { idToken, accessToken } = createTokens('1', stateAndNonce.nonce);
        const authenticationResponse = `https://kibana.com/api/security/v1/oidc/implicit#id_token=${idToken}&state=${stateAndNonce.state}&token_type=bearer&access_token=${accessToken}`;

        const oidcAuthenticationResponse = await supertest
          .get(
            `/api/security/v1/oidc?authenticationResponseURI=${encodeURIComponent(
              authenticationResponse
            )}`
          )
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);

        // User should be redirected to the URL that initiated handshake.
        expect(oidcAuthenticationResponse.headers.location).to.be(
          '/abc/xyz/handshake?one=two%20three'
        );

        const cookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const sessionCookie = request.cookie(cookies[0])!;
        expect(sessionCookie.key).to.be('sid');
        expect(sessionCookie.value).to.not.be.empty();
        expect(sessionCookie.path).to.be('/');
        expect(sessionCookie.httpOnly).to.be(true);

        const apiResponse = await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);
        expect(apiResponse.body).to.only.have.keys([
          'username',
          'full_name',
          'email',
          'roles',
          'metadata',
          'enabled',
          'authentication_realm',
          'lookup_realm',
        ]);

        expect(apiResponse.body.username).to.be('user1');
      });
    });
  });
}
