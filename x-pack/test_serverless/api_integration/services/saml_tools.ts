/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse as parseCookie } from 'tough-cookie';
import Url from 'url';

import { createSAMLResponse } from '@kbn/mock-idp-utils';
import { FtrProviderContext } from '../ftr_provider_context';

export function SamlToolsProvider({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');
  const config = getService('config');

  return {
    async login(username: string) {
      const kibanaUrl = Url.format({
        protocol: config.get('servers.kibana.protocol'),
        hostname: config.get('servers.kibana.hostname'),
        port: config.get('servers.kibana.port'),
        pathname: '/api/security/saml/callback',
      });
      const samlAuthenticationResponse = await supertestWithoutAuth
        .post('/api/security/saml/callback')
        .set(svlCommonApi.getCommonRequestHeader())
        .send({
          SAMLResponse: await createSAMLResponse({
            username,
            roles: [],
            kibanaUrl,
          }),
        });
      expect(samlAuthenticationResponse.status).to.equal(302);
      expect(samlAuthenticationResponse.header.location).to.equal('/');
      const sessionCookie = parseCookie(samlAuthenticationResponse.header['set-cookie'][0])!;
      return { Cookie: sessionCookie.cookieString() };
    },
  };
}
