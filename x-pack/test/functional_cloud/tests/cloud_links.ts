/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'header']);

  describe('Cloud Links integration', function () {
    before(async () => {
      // Create role mapping so user gets superuser access
      await getService('esSupertest')
        .post('/_security/role_mapping/cloud-saml-kibana')
        .send({
          roles: ['superuser'],
          enabled: true,
          rules: { field: { 'realm.name': 'cloud-saml-kibana' } },
        })
        .expect(200);
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToUrl('home');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    describe('Guided onboarding', () => {
      it('The button "Setup guides" is loaded', async () => {
        expect(await find.byCssSelector('[data-test-subj="guideButtonRedirect"]')).to.not.be(null);
        const cloudLink = await find.byLinkText('Setup guides');
        expect(cloudLink).to.not.be(null);
      });

      it('The help link "Setup guides" is added', async () => {
        await PageObjects.common.clickAndValidate(
          'helpMenuButton',
          'cloudOnboardingSetupGuideLink'
        );
        expect(
          await find.byCssSelector('[data-test-subj="cloudOnboardingSetupGuideLink"]')
        ).to.not.be(null);
      });

      it('Can open "Connection details" overlay with ES URL and Cloud ID', async () => {
        await PageObjects.common.clickAndValidate('helpMenuButton', 'connectionDetailsHelpLink');
        expect(await find.byCssSelector('[data-test-subj="connectionDetailsHelpLink"]')).to.not.be(
          null
        );

        // Open connection details overlay.
        await PageObjects.common.clickAndValidate(
          'connectionDetailsHelpLink',
          'deploymentDetailsModal'
        );

        const esUrlRow = await find.byCssSelector('[data-test-subj="connectionDetailsEsUrl"]');
        const esUrlText = await esUrlRow.findByTestSubject('copyText');
        const esUrlTextValue = await esUrlText.getVisibleText();
        expect(esUrlTextValue).to.be('https://ES123abc.hello.com:443');

        // Show Cloud ID text row.
        await PageObjects.common.clickAndValidate(
          'connectionDetailsCloudIdSwitch',
          'connectionDetailsCloudId'
        );

        const cloudIdRow = await find.byCssSelector('[data-test-subj="connectionDetailsCloudId"]');
        const cloudIdText = await cloudIdRow.findByTestSubject('copyText');
        const cloudIdTextValue = await cloudIdText.getVisibleText();
        expect(cloudIdTextValue).to.be(
          'ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM='
        );
      });

      it('Can create an API key', async () => {
        // Open connection details overlay.
        await PageObjects.common.clickAndValidate('helpMenuButton', 'connectionDetailsHelpLink');
        await PageObjects.common.clickAndValidate(
          'connectionDetailsHelpLink',
          'deploymentDetailsModal'
        );

        // Navigate to the "API key" tab.
        await PageObjects.common.clickAndValidate(
          'connectionDetailsTabBtn-apiKeys',
          'connectionDetailsApiKeyForm'
        );

        // Select the input form.
        const form = await find.byCssSelector(
          '[data-test-subj="connectionDetailsApiKeyConfigForm"]'
        );

        // Select the name <input> in that form.
        const nameInput = await form.findByCssSelector('[name="api-key-name"]');

        // Enter a name for the API key.
        const keyName = 'test-api-key-' + Date.now().toString(36);
        await nameInput.type(keyName);

        // Click the submit button.
        const submitButton = await form.findByCssSelector('button[type="submit"]');
        await submitButton.click();

        // Wait for the success message to appear.
        const successForm = await find.byCssSelector(
          '[data-test-subj="connectionDetailsApiKeySuccessForm"]'
        );

        // Check that user is shown the API key value.
        const apiKeyRow = await successForm.findByTestSubject('connectionDetailsApiKeyValueRow');
        const apiKeyText = await apiKeyRow.findByTestSubject('copyText');
        const apiKeyTextValue = await apiKeyText.getVisibleText();
        expect(apiKeyTextValue.length).to.be.greaterThan(40);
      });
    });

    it('"Manage this deployment" is appended to the nav list', async () => {
      await PageObjects.common.clickAndValidate('toggleNavButton', 'collapsibleNavCustomNavLink');
      const cloudLink = await find.byLinkText('Manage this deployment');
      expect(cloudLink).to.not.be(null);
    });

    describe('Fills up the user menu items', () => {
      it('Shows the button Profile', async () => {
        await PageObjects.common.clickAndValidate('userMenuButton', 'userMenuLink__Profile');
        const cloudLink = await find.byLinkText('Profile');
        expect(cloudLink).to.not.be(null);
      });

      it('Shows the button Billing', async () => {
        await PageObjects.common.clickAndValidate('userMenuButton', 'userMenuLink__Billing');
        const cloudLink = await find.byLinkText('Billing');
        expect(cloudLink).to.not.be(null);
      });

      it('Shows the button Organization', async () => {
        await PageObjects.common.clickAndValidate('userMenuButton', 'userMenuLink__Organization');
        const cloudLink = await find.byLinkText('Organization');
        expect(cloudLink).to.not.be(null);
      });

      it('Shows the theme darkMode toggle', async () => {
        await PageObjects.common.clickAndValidate('userMenuButton', 'darkModeToggle');
        const darkModeSwitch = await find.byCssSelector('[data-test-subj="darkModeToggleSwitch"]');
        expect(darkModeSwitch).to.not.be(null);
      });
    });
  });
}
