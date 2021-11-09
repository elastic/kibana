/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const security = getService('security');
  const deployment = getService('deployment');
  const testSubjects = getService('testSubjects');
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

      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      await security.user.delete('anonymous_user');
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
    });

    beforeEach(async () => {
      await browser.get(`${deployment.getHostPort()}/login`);
      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
    });

    afterEach(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
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

    it('re-initiates SSO handshake even with unauthenticated session', async () => {
      // 1. Try to authenticate with SAML that never completes SAML handshake. In this case we end
      // up with the cookie pointing to the intermediate unauthenticated session.
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'management',
        '/security/users',
        '?auth_provider_hint=saml_never',
        { ensureCurrentUrl: false, shouldLoginIfPrompted: false }
      );
      await testSubjects.stringExistsInCodeBlockOrFail('idp-page', 'Attempt #1');

      // 2. Now navigate to the same URL again and make sure we're still automatically redirected to IDP.
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'management',
        '/security/users',
        '?auth_provider_hint=saml_never',
        { ensureCurrentUrl: false, shouldLoginIfPrompted: false }
      );
      await testSubjects.stringExistsInCodeBlockOrFail('idp-page', 'Attempt #2');

      // 3. Finally try another SSO provider.
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
