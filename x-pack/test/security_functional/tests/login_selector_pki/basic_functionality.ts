/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { readFileSync } from 'fs';
import { parse } from 'url';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FtrProviderContext } from '../../ftr_provider_context';

const CA_CERT = readFileSync(CA_CERT_PATH);
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['security', 'common']);

  describe('Basic functionality', function () {
    // this.tags('includeFirefox');

    before(async () => {
      await getService('esSupertest')
        .post('/_security/role_mapping/pki1')
        .ca(CA_CERT)
        .send({ roles: ['superuser'], enabled: true, rules: { field: { 'realm.name': 'pki1' } } })
        .expect(200);
      await PageObjects.security.forceLogout();
    });

    beforeEach(async () => {
      await browser.get(`${PageObjects.common.getHostPort()}/login`);
      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
    });

    afterEach(async () => {
      await PageObjects.security.forceLogout();
    });

    it('can login with Login Form preserving original URL', async () => {
      await PageObjects.common.navigateToUrl('management', 'security/users', {
        ensureCurrentUrl: false,
        shouldLoginIfPrompted: false,
        shouldUseHashForSubUrl: false,
      });
      await PageObjects.common.waitUntilUrlIncludes('next=');

      await PageObjects.security.loginSelector.login('pki', 'pki1');

      // We need to make sure that both path and hash are respected.
      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/app/management/security/users');
    });
  });
}
