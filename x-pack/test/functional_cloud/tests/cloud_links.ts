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

    it('The button "Setup guides" is loaded', async () => {
      expect(await find.byCssSelector('[data-test-subj="guideButtonRedirect"]')).to.not.be(null);
      const cloudLink = await find.byLinkText('Setup guides');
      expect(cloudLink).to.not.be(null);
    });

    it('"Manage this deployment" is appended to the nav list', async () => {
      await PageObjects.common.clickAndValidate('toggleNavButton', 'collapsibleNavCustomNavLink');
      const cloudLink = await find.byLinkText('Manage this deployment');
      expect(cloudLink).to.not.be(null);
    });

    describe('Fills up the user menu items', () => {
      it('Shows the button Edit profile', async () => {
        await PageObjects.common.clickAndValidate('userMenuButton', 'userMenuLink__Edit profile');
        const cloudLink = await find.byLinkText('Edit profile');
        expect(cloudLink).to.not.be(null);
      });

      it('Shows the button Account & Billing', async () => {
        await PageObjects.common.clickAndValidate(
          'userMenuButton',
          'userMenuLink__Account & Billing'
        );
        const cloudLink = await find.byLinkText('Account & Billing');
        expect(cloudLink).to.not.be(null);
      });
    });
  });
}
