/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import os from 'os';
import kerberos from 'kerberos';

export default function ({ getService }) {
  const supertest = getService('supertestWithoutAuth');

  describe('SAML authentication', () => {
    it('should reject API requests if client is not authenticated', async () => {
      await supertest
        .get('/api/security/v1/me')
        .set('kbn-xsrf', 'xxx')
        .expect(401);
    });

    describe('initiating handshake', () => {
      it('should properly respond with challenge cookie and redirect user', async () => {
        const handshakeResponse = await supertest.get('/abc/xyz/handshake?one=two three')
          .expect(401);

        console.log(handshakeResponse.headers);
      });

      it('should auth', async () => {
        const service = `HTTP@${os.hostname()}`;
        const mechOID = kerberos.GSS_MECH_OID_SPNEGO;
        const principal = 'george@BUILD.ELASTIC.CO';

        const client = await kerberos.initializeClient(service, { mechOID, principal });
        const clientResponse = await client.step('');

        await supertest
          .get('/api/security/v1/me')
          .set('kbn-xsrf', 'xxx')
          .set('Authorization', `Negotiate ${clientResponse}`)
          .expect(200);
      });
    });
  });
}
