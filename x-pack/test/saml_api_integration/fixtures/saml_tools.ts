/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import fs from 'fs';
import querystring from 'querystring';
import url from 'url';
import zlib from 'zlib';
import { promisify } from 'util';
import { parseString } from 'xml2js';
import { SignedXml } from 'xml-crypto';
import { KBN_KEY_PATH } from '@kbn/dev-utils';

/**
 * @file Defines a set of tools that allow us to parse and generate various SAML XML messages.
 * The format of these XML messages is a minimum accepted by Elasticsearch and based on the format
 * used by `Auth0` identity provider, `auth0/node-samlp` package and SAML 2.0 Specification:
 * http://docs.oasis-open.org/security/saml/v2.0/saml-bindings-2.0-os.pdf.
 */

const inflateRawAsync = promisify(zlib.inflateRaw);
const deflateRawAsync = promisify(zlib.deflateRaw);
const parseStringAsync = promisify(parseString);

const signingKey = fs.readFileSync(KBN_KEY_PATH);
const signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';

export async function getSAMLRequestId(urlWithSAMLRequestId: string) {
  const inflatedSAMLRequest = (await inflateRawAsync(
    Buffer.from(
      url.parse(urlWithSAMLRequestId, true /* parseQueryString */).query.SAMLRequest as string,
      'base64'
    )
  )) as Buffer;

  const parsedSAMLRequest = (await parseStringAsync(inflatedSAMLRequest.toString())) as any;
  return parsedSAMLRequest['saml2p:AuthnRequest'].$.ID;
}

export async function getSAMLResponse({
  destination,
  inResponseTo,
  sessionIndex,
  username = 'a@b.c',
}: { destination?: string; inResponseTo?: string; sessionIndex?: string; username?: string } = {}) {
  const issueInstant = new Date().toISOString();
  const notOnOrAfter = new Date(Date.now() + 3600 * 1000).toISOString();

  const samlAssertionTemplateXML = `
    <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" Version="2.0"
                    ID="_RPs1WfOkul8lZ72DtJtes0BKyPgaCamg" IssueInstant="${issueInstant}">
      <saml:Issuer>http://www.elastic.co</saml:Issuer>
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
      <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">http://www.elastic.co</saml:Issuer>
      <samlp:Status>
        <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
      </samlp:Status>${signature.getSignedXml()}
    </samlp:Response>
  `
  ).toString('base64');
}

export async function getLogoutRequest({
  destination,
  sessionIndex,
}: {
  destination: string;
  sessionIndex: string;
}) {
  const issueInstant = new Date().toISOString();
  const logoutRequestTemplateXML = `
      <samlp:LogoutRequest ID="_d71a01e2f5ca2b88bf85" Version="2.0" IssueInstant="${issueInstant}"
                         Destination="${destination}"
                         Consent="urn:oasis:names:tc:SAML:2.0:consent:unspecified"
                         xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
      <Issuer xmlns="urn:oasis:names:tc:SAML:2.0:assertion">http://www.elastic.co</Issuer>
      <NameID xmlns="urn:oasis:names:tc:SAML:2.0:assertion"
              Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">a@b.c</NameID>
      <samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>
    </samlp:LogoutRequest>
  `;

  // HTTP-Redirect with deflate encoding:
  // http://docs.oasis-open.org/security/saml/v2.0/saml-bindings-2.0-os.pdf - section 3.4.4.1
  const deflatedLogoutRequest = (await deflateRawAsync(
    Buffer.from(logoutRequestTemplateXML)
  )) as Buffer;

  const queryStringParameters: Record<string, string> = {
    SAMLRequest: deflatedLogoutRequest.toString('base64'),
    SigAlg: signatureAlgorithm,
  };

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(querystring.stringify(queryStringParameters));
  queryStringParameters.Signature = signer.sign(signingKey.toString(), 'base64');

  return queryStringParameters;
}
