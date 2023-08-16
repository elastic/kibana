/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
// import { getSAMLResponse } from '@kbn/security-api-integration-helpers/saml/saml_tools';
import { kbnTestConfig } from '@kbn/test';
import { KBN_KEY_PATH } from '@kbn/dev-utils';

import fs from 'fs';
import { SignedXml } from 'xml-crypto';
import { parse as parseCookie } from 'tough-cookie';

import { FtrProviderContext } from '../ftr_provider_context';

export function SamlToolsProvider({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const randomness = getService('randomness');

  const signingKey = fs.readFileSync(KBN_KEY_PATH);
  const signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';

  async function getSAMLResponse({
  destination,
  inResponseTo,
  sessionIndex,
  username = 'a@b.c',
  issuer = 'http://www.elastic.co/saml1',
  }: {
    destination?: string;
    inResponseTo?: string;
    sessionIndex?: string;
    username?: string;
    issuer?: string;
  } = {}) {
    const issueInstant = new Date().toISOString();
    const notOnOrAfter = new Date(Date.now() + 3600 * 1000).toISOString();

    const samlAssertionTemplateXML = `
      <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" Version="2.0"
                      ID="_RPs1WfOkul8lZ72DtJtes0BKyPgaCamg" IssueInstant="${issueInstant}">
        <saml:Issuer>${issuer}</saml:Issuer>
        <saml:Subject>
          <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">a@b.c</saml:NameID>
          <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
            <saml:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter}"
                                          Recipient="${destination}"
                                          ${inResponseTo ? `InResponseTo="${inResponseTo}"` : ''} />
          </saml:SubjectConfirmation>
        </saml:Subject>
        <saml:AuthnStatement AuthnInstant="${issueInstant}" SessionIndex="${sessionIndex}">
          <saml:AuthnContext>
            <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified</saml:AuthnContextClassRef>
          </saml:AuthnContext>
        </saml:AuthnStatement>
        <saml:AttributeStatement xmlns:xs="http://www.w3.org/2001/XMLSchema"
                              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <saml:Attribute Name="urn:oid:0.0.7" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
            <saml:AttributeValue xsi:type="xs:string">${username}</saml:AttributeValue>
          </saml:Attribute>
        </saml:AttributeStatement>
      </saml:Assertion>
    `;

    const signature = new SignedXml();
    signature.signatureAlgorithm = signatureAlgorithm;
    signature.signingKey = signingKey;

    // Adds a reference to a `Assertion` xml element and an array of transform algorithms to be used during signing.
    signature.addReference(
      `//*[local-name(.)='Assertion']`,
      [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/2001/10/xml-exc-c14n#',
      ],
      'http://www.w3.org/2001/04/xmlenc#sha256'
    );

    signature.computeSignature(samlAssertionTemplateXML, {
      location: { reference: `//*[local-name(.)='Issuer']`, action: 'after' },
    });

    return Buffer.from(
      `
      <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_bdf1d51245ed0f71aa23"
                    ${inResponseTo ? `InResponseTo="${inResponseTo}"` : ''} Version="2.0"
                    IssueInstant="${issueInstant}"
                    Destination="${destination}">
        <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${issuer}</saml:Issuer>
        <samlp:Status>
          <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
        </samlp:Status>${signature.getSignedXml()}
      </samlp:Response>
    `
    ).toString('base64');
  }

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
        .set('kbn-xsrf', 'some-xsrf-token')
        .send({ SAMLResponse: await createSAMLResponse({ username }) });
      expect(samlAuthenticationResponse.status).to.equal(302);
      expect(samlAuthenticationResponse.header.location).to.equal('/');
      const sessionCookie = parseCookie(samlAuthenticationResponse.header['set-cookie'][0])!;
      return sessionCookie;
    },
  };
}
