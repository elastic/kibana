/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['security', 'common']);

  describe('Login Selector', function() {
    this.tags('includeFirefox');

    before(async () => {
      await getService('esSupertest')
        .post('/_security/role_mapping/saml1')
        .send({ roles: ['superuser'], enabled: true, rules: { field: { 'realm.name': 'saml1' } } })
        .expect(200);

      await esArchiver.load('empty_kibana');
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    beforeEach(async () => {
      await browser.get(`${PageObjects.common.getHostPort()}/login`);
      await PageObjects.security.loginSelector.verifyLoginSelectorIsVisible();
    });

    afterEach(async () => {
      await PageObjects.security.forceLogout();
    });

    it('can login with Login Form', async () => {
      await PageObjects.security.loginSelector.login('basic', 'basic1');
    });

    it('can login with SSO', async () => {
      await PageObjects.security.loginSelector.login('saml', 'saml1');
    });

    it('should show toast with error if SSO fails', async () => {
      await PageObjects.security.loginSelector.selectLoginMethod('saml', 'unknown_saml');

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
