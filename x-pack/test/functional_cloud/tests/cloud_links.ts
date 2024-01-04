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

      it('A button to open a modal to view the CloudID and ES endpoint is added', async () => {
        await PageObjects.common.clickAndValidate('helpMenuButton', 'connectionDetailsHelpLink');
        expect(await find.byCssSelector('[data-test-subj="connectionDetailsHelpLink"]')).to.not.be(
          null
        );

        // Open the modal
        await PageObjects.common.clickAndValidate(
          'connectionDetailsHelpLink',
          'deploymentDetailsModal'
        );

        const esEndpointInput = await find.byCssSelector(
          '[data-test-subj="deploymentDetailsEsEndpoint"]'
        );
        const esEndpointValue = await esEndpointInput.getAttribute('value');
        expect(esEndpointValue).to.be('https://ES123abc.hello.com:443');

        const cloudIdInput = await find.byCssSelector(
          '[data-test-subj="deploymentDetailsCloudID"]'
        );
        const cloudIdInputValue = await cloudIdInput.getAttribute('value');
        expect(cloudIdInputValue).to.be(
          'ftr_fake_cloud_id:aGVsbG8uY29tOjQ0MyRFUzEyM2FiYyRrYm4xMjNhYmM='
        );
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
