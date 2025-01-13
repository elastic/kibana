/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'settings', 'security']);
  const appsMenu = getService('appsMenu');
  const managementMenu = getService('managementMenu');

  // Failing: See https://github.com/elastic/kibana/issues/167073
  describe.skip('security', function () {
    this.tags('upgradeAssistant');
    before(async () => {
      await PageObjects.common.navigateToApp('home');
    });

    describe('global all privileges (aka kibana_admin)', () => {
      before(async () => {
        await security.testUser.setRoles(['kibana_admin']);
      });
      after(async () => {
        await security.testUser.restoreDefaults();
      });

      it('should show the Stack Management nav link', async () => {
        const links = await appsMenu.readLinks();
        expect(links.map((link) => link.text)).to.contain('Stack Management');
      });

      it('should not render the "Stack" section', async () => {
        await PageObjects.common.navigateToApp('management');
        const sections = await managementMenu.getSections();

        const sectionIds = sections.map((section) => section.sectionId);
        expect(sectionIds).to.eql(['data', 'insightsAndAlerting', 'kibana']);

        const dataSection = sections.find((section) => section.sectionId === 'data');
        expect(dataSection?.sectionLinks).to.eql(['data_quality']);
      });
    });

    describe('global dashboard read with global_upgrade_assistant_role', () => {
      before(async () => {
        await security.testUser.setRoles([
          'global_dashboard_read',
          'global_upgrade_assistant_role',
        ]);
      });
      after(async () => {
        await security.testUser.restoreDefaults();
      });
      it('should show the Stack Management nav link', async () => {
        const links = await appsMenu.readLinks();
        expect(links.map((link) => link.text)).to.contain('Stack Management');
      });

      describe('[SkipCloud] global dashboard read with global_upgrade_assistant_role', function () {
        this.tags('skipCloud');
        it('should render the "Stack" section with Upgrade Assistant', async function () {
          await PageObjects.common.navigateToApp('management');
          const sections = await managementMenu.getSections();
          expect(sections).to.have.length(3);
          expect(sections[2]).to.eql({
            sectionId: 'stack',
            sectionLinks: ['license_management', 'upgrade_assistant'],
          });
        });
      });
    });
  });
}
