/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { parse } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const security = getService('security');
  const PageObjects = getPageObjects(['security', 'common']);

  describe('Authentication provider hint', function () {
    this.tags('includeFirefox');

    before(async () => {
      await getService('esSupertest')
        .post('/_security/role_mapping/saml1')
        .send({ roles: ['superuser'], enabled: true, rules: { field: { 'realm.name': 'saml1' } } })
        .expect(200);

      await security.user.create('anonymous_user', {
        password: 'changeme',
        roles: ['superuser'],
        full_name: 'Guest',
      });

      await esArchiver.load('../../functional/es_archives/empty_kibana');
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      await security.user.delete('anonymous_user');
      await esArchiver.unload('../../functional/es_archives/empty_kibana');
    });

    beforeEach(async () => {
      await browser.get(`${PageObjects.common.getHostPort()}/login`);
      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
    });

    afterEach(async () => {
      await PageObjects.security.forceLogout();
    });

    it('automatically activates Login Form preserving original URL', async () => {
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'management',
        '/security/users',
        '?auth_provider_hint=basic1',
        { ensureCurrentUrl: false, shouldLoginIfPrompted: false }
      );
      await PageObjects.common.waitUntilUrlIncludes('next=');

      // Login form should be automatically activated by the auth provider hint.
      await PageObjects.security.loginSelector.verifyLoginFormIsVisible();
      await PageObjects.security.loginPage.login(undefined, undefined, { expectSuccess: true });

      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/app/management/security/users');
      expect((await PageObjects.security.getCurrentUser())?.authentication_provider).to.eql({
        type: 'basic',
        name: 'basic1',
      });
    });

    it('automatically login with SSO preserving original URL', async () => {
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'management',
        '/security/users',
        '?auth_provider_hint=saml1',
        { ensureCurrentUrl: false, shouldLoginIfPrompted: false }
      );

      await PageObjects.common.waitUntilUrlIncludes('/app/management/security/users');

      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/app/management/security/users');
      expect((await PageObjects.security.getCurrentUser())?.authentication_provider).to.eql({
        type: 'saml',
        name: 'saml1',
      });
    });

    it('can login anonymously preserving original URL', async () => {
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'management',
        '/security/users',
        '?auth_provider_hint=anonymous1',
        { ensureCurrentUrl: false, shouldLoginIfPrompted: false }
      );

      await PageObjects.common.waitUntilUrlIncludes('/app/management/security/users');

      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/app/management/security/users');
      expect((await PageObjects.security.getCurrentUser())?.authentication_provider).to.eql({
        type: 'anonymous',
        name: 'anonymous1',
      });
    });
  });
}
