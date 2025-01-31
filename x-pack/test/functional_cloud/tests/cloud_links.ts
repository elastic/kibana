/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DarkModeValue as ColorMode } from '@kbn/user-profile-components';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'header', 'userProfiles', 'settings']);
  const testSubjects = getService('testSubjects');

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

      it('Shows the appearance button', async () => {
        await PageObjects.common.clickAndValidate('userMenuButton', 'appearanceSelector');
      });
    });

    describe('Appearance selector modal', () => {
      const openAppearanceSelectorModal = async () => {
        // Check if the user menu is open
        await find.byCssSelector('[data-test-subj="userMenu"]', 1000).catch(async () => {
          await testSubjects.click('userMenuButton');
        });
        await testSubjects.click('appearanceSelector');
        const appearanceModal = await find.byCssSelector(
          '[data-test-subj="appearanceModal"]',
          1000
        );
        expect(appearanceModal).to.not.be(null);
      };

      const refreshPage = async () => {
        await browser.refresh();
        await testSubjects.exists('globalLoadingIndicator-hidden');
      };

      const changeColorMode = async (colorMode: ColorMode) => {
        await openAppearanceSelectorModal();
        await testSubjects.click(`colorModeKeyPadItem${colorMode}`);
        await testSubjects.click('appearanceModalSaveButton');
        await testSubjects.missingOrFail('appearanceModal');
      };

      after(async () => {
        await changeColorMode('space_default');

        await PageObjects.common.navigateToUrl('management', 'kibana/settings', {
          basePath: '',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });

        // Reset the space default dark mode to "disabled"
        await PageObjects.settings.setAdvancedSettingsSelect('theme:darkMode', 'disabled');
        {
          const advancedSetting = await PageObjects.settings.getAdvancedSettings('theme:darkMode');
          expect(advancedSetting).to.be('disabled');
        }

        await refreshPage();
      });

      it('has 4 color mode options to chose from', async () => {
        await openAppearanceSelectorModal();
        const colorModes: ColorMode[] = ['light', 'dark', 'system', 'space_default'];
        for (const colorMode of colorModes) {
          const themeModeButton = await testSubjects.find(`colorModeKeyPadItem${colorMode}`, 1000);
          expect(themeModeButton).to.not.be(null);
        }
        await testSubjects.click('appearanceModalDiscardButton');
      });

      it('can change the color mode to dark', async () => {
        await changeColorMode('dark');
        await refreshPage();
        const colorModeTag = await PageObjects.userProfiles.getThemeTag();
        expect(colorModeTag).to.be('borealisdark');
      });

      it('can change the color mode to light', async () => {
        await changeColorMode('light');
        await refreshPage();
        const colorModeTag = await PageObjects.userProfiles.getThemeTag();
        expect(colorModeTag).to.be('borealislight');
      });

      it('can change the color mode to space_default', async () => {
        // Let's make sure we are in light mode before changing to space_default
        await changeColorMode('light');

        {
          await refreshPage();
          const colorModeTag = await PageObjects.userProfiles.getThemeTag();
          expect(colorModeTag).to.be('borealislight');
        }

        // Change the space default dark mode to "enabled"
        await PageObjects.common.navigateToUrl('management', 'kibana/settings', {
          basePath: '',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });

        await PageObjects.settings.setAdvancedSettingsSelect('theme:darkMode', 'enabled');
        {
          const advancedSetting = await PageObjects.settings.getAdvancedSettings('theme:darkMode');
          expect(advancedSetting).to.be('enabled');
        }

        // Make sure we are still in light mode as per the User profile
        // even after setting the space default to "dark"
        {
          await refreshPage();
          const colorModeTag = await PageObjects.userProfiles.getThemeTag();
          expect(colorModeTag).to.be('borealislight');
        }

        await changeColorMode('space_default');

        {
          await refreshPage();
          const colorModeTag = await PageObjects.userProfiles.getThemeTag();
          expect(colorModeTag).to.be('borealisdark'); // We are now in dark mode
        }
      });
    });
  });
}
