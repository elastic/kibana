/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { getSAMLResponse } from '@kbn/security-api-integration-helpers/saml/saml_tools';
import { kbnTestConfig } from '@kbn/test';

import { parse as parseCookie } from 'tough-cookie';

import { FtrProviderContext } from '../ftr_provider_context';

export function SamlToolsProvider({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const randomness = getService('randomness');
  const svlCommonApi = getService('svlCommonApi');

  function createSAMLResponse(options = {}) {
    return getSAMLResponse({
      destination: `http://localhost:${kbnTestConfig.getPort()}/api/security/saml/callback`,
      sessionIndex: String(randomness.naturalNumber()),
      ...options,
    });
  }

  return {
    async login(username: string) {
      const samlAuthenticationResponse = await supertestWithoutAuth
        .post('/api/security/saml/callback')
        .set(svlCommonApi.getCommonRequestHeader())
        .send({ SAMLResponse: await createSAMLResponse({ username }) });
      expect(samlAuthenticationResponse.status).to.equal(302);
      expect(samlAuthenticationResponse.header.location).to.equal('/');
      const sessionCookie = parseCookie(samlAuthenticationResponse.header['set-cookie'][0])!;
      return { Cookie: sessionCookie.cookieString() };
    },
  };
}
