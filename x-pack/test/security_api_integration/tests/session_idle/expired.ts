/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { parse as parseCookie } from 'tough-cookie';

import expect from '@kbn/expect';
import { SESSION_ERROR_REASON_HEADER } from '@kbn/security-plugin/common/constants';
import { adminTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const log = getService('log');
  const { username: basicUsername, password: basicPassword } = adminTestUser;

  async function getNumberOfSessionDocuments() {
    return (
      // @ts-expect-error doesn't handle total as number
      (await es.search({ index: '.kibana_security_session*' })).hits.total.value as number
    );
  }

  describe('Session expired', () => {
    beforeEach(async () => {
      await es.cluster.health({ index: '.kibana_security_session*', wait_for_status: 'green' });
      await esDeleteAllIndices('.kibana_security_session*');
    });

    it(`return ${SESSION_ERROR_REASON_HEADER} header if session is expired`, async function () {
      this.timeout(100000);

      log.debug(`Log in as ${basicUsername} using ${basicPassword} password.`);
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username: basicUsername, password: basicPassword },
        })
        .expect(200);
      await es.indices.refresh({ index: '.kibana_security_session*' });

      const sessionCookie = parseCookie(response.headers['set-cookie'][0])!;
      expect(await getNumberOfSessionDocuments()).to.be(1);

      log.debug(`Authenticating as ${basicUsername} with valid session cookie.`);
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .expect(200);

      // sessions expire based on the `xpack.security.session.idleTimeout` config and is 10s in this test
      log.debug('Waiting for session to expire...');
      await setTimeoutAsync(11000);

      // Session info should not be removed yet (if cleanup is run before we expect, then it will be)
      expect(await getNumberOfSessionDocuments()).to.be(1);

      log.debug(`Authenticating as ${basicUsername} with expired session cookie.`);
      const resp = await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie.cookieString())
        .expect(401);

      expect(resp.headers[SESSION_ERROR_REASON_HEADER]).to.be('SESSION_EXPIRED');
    });
  });
}
