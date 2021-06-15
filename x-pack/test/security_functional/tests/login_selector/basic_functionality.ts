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
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const security = getService('security');
  const deployment = getService('deployment');
  const PageObjects = getPageObjects(['security', 'common']);

  // FLAKY: https://github.com/elastic/kibana/issues/98562
  describe.skip('Basic functionality', function () {
    this.tags('includeFirefox');

    const testCredentials = { username: 'admin_user', password: 'change_me' };
    before(async () => {
      await getService('esSupertest')
        .post('/_security/role_mapping/saml1')
        .send({ roles: ['superuser'], enabled: true, rules: { field: { 'realm.name': 'saml1' } } })
        .expect(200);

      await security.user.create(testCredentials.username, {
        password: testCredentials.password,
        roles: ['kibana_admin'],
        full_name: 'Admin',
      });

      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      await security.user.delete(testCredentials.username);
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
    });

    beforeEach(async () => {
      await browser.get(`${deployment.getHostPort()}/login`);
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

      await PageObjects.security.loginSelector.login('basic', 'basic1');

      // We need to make sure that both path and hash are respected.
      const currentURL = parse(await browser.getCurrentUrl());

      expect(currentURL.pathname).to.eql('/app/management/security/users');
    });

    it('can login with SSO preserving original URL', async () => {
      await PageObjects.common.navigateToUrl('management', 'security/users', {
        ensureCurrentUrl: false,
        shouldLoginIfPrompted: false,
        shouldUseHashForSubUrl: false,
      });
      await PageObjects.common.waitUntilUrlIncludes('next=');

      await PageObjects.security.loginSelector.login('saml', 'saml1');

      // We need to make sure that both path and hash are respected.
      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/app/management/security/users');
    });

    it('can login anonymously preserving original URL', async () => {
      await PageObjects.common.navigateToUrl('management', 'security/users', {
        ensureCurrentUrl: false,
        shouldLoginIfPrompted: false,
        shouldUseHashForSubUrl: false,
      });
      await PageObjects.common.waitUntilUrlIncludes('next=');

      await security.user.create('anonymous_user', {
        password: 'changeme',
        roles: ['superuser'],
        full_name: 'Guest',
      });
      await PageObjects.security.loginSelector.login('anonymous', 'anonymous1');
      await security.user.delete('anonymous_user');

      // We need to make sure that both path and hash are respected.
      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/app/management/security/users');
    });

    it('can login after `Unauthorized` error after request authentication preserving original URL', async () => {
      await getService('supertest')
        .post('/authentication/app/setup')
        .send({ simulateUnauthorized: true })
        .expect(200);
      await PageObjects.security.loginSelector.login('basic', 'basic1');
      await browser.get(`${deployment.getHostPort()}/authentication/app?one=two`);

      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
      expect(await PageObjects.security.loginPage.getErrorMessage()).to.be(
        "We hit an authentication error. Please check your credentials and try again. If you still can't log in, contact your system administrator."
      );

      await getService('supertest')
        .post('/authentication/app/setup')
        .send({ simulateUnauthorized: false })
        .expect(200);
      await PageObjects.security.loginSelector.login('basic', 'basic1');

      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.path).to.eql('/authentication/app?one=two');
    });

    it('can login after `Unauthorized` error during request authentication preserving original URL', async () => {
      // 1. Navigate to Kibana to make sure user is properly authenticated.
      await PageObjects.common.navigateToUrl('management', 'security/users', {
        ensureCurrentUrl: false,
        shouldLoginIfPrompted: false,
        shouldUseHashForSubUrl: false,
      });
      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
      await PageObjects.security.loginSelector.login('basic', 'basic1', testCredentials);
      expect(parse(await browser.getCurrentUrl()).pathname).to.eql(
        '/app/management/security/users'
      );

      // 2. Now disable user and try to refresh page causing authentication to fail.
      await security.user.disable(testCredentials.username);
      await browser.refresh();
      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
      expect(await PageObjects.security.loginPage.getErrorMessage()).to.be(
        "We hit an authentication error. Please check your credentials and try again. If you still can't log in, contact your system administrator."
      );

      // 3. Re-enable user and try to login again.
      await security.user.enable(testCredentials.username);
      await PageObjects.security.loginSelector.login('basic', 'basic1', testCredentials);
      expect(parse(await browser.getCurrentUrl()).pathname).to.eql(
        '/app/management/security/users'
      );
    });

    it('should show toast with error if SSO fails', async () => {
      await PageObjects.security.loginSelector.selectLoginMethod('saml', 'unknown_saml');

      const toastTitle = await PageObjects.common.closeToast();
      expect(toastTitle).to.eql('Could not perform login.');

      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
    });

    it('should show toast with error if anonymous login fails', async () => {
      await PageObjects.security.loginSelector.selectLoginMethod('anonymous', 'anonymous1');

      const toastTitle = await PageObjects.common.closeToast();
      expect(toastTitle).to.eql('Could not perform login.');

      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
    });

    it('can go to Login Form and return back to Selector', async () => {
      await PageObjects.security.loginSelector.selectLoginMethod('basic', 'basic1');
      await PageObjects.security.loginSelector.verifyLoginFormIsVisible();

      await testSubjects.click('loginBackToSelector');
      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();

      await PageObjects.security.loginSelector.login('saml', 'saml1');
    });

    it('can show Login Help from both Login Selector and Login Form', async () => {
      // Show Login Help from Login Selector.
      await testSubjects.click('loginHelpLink');
      await PageObjects.security.loginSelector.verifyLoginHelpIsVisible('Some-login-help.');

      // Go back to Login Selector.
      await testSubjects.click('loginBackToLoginLink');
      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();

      // Go to Login Form and show Login Help there.
      await PageObjects.security.loginSelector.selectLoginMethod('basic', 'basic1');
      await PageObjects.security.loginSelector.verifyLoginFormIsVisible();
      await testSubjects.click('loginHelpLink');
      await PageObjects.security.loginSelector.verifyLoginHelpIsVisible('Some-login-help.');

      // Go back to Login Form.
      await testSubjects.click('loginBackToLoginLink');
      await PageObjects.security.loginSelector.verifyLoginFormIsVisible();

      // Go back to Login Selector and show Login Help there again.
      await testSubjects.click('loginBackToSelector');
      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
      await testSubjects.click('loginHelpLink');
      await PageObjects.security.loginSelector.verifyLoginHelpIsVisible('Some-login-help.');

      // Go back to Login Selector.
      await testSubjects.click('loginBackToLoginLink');
      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
    });
  });
}
