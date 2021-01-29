/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'settings', 'security']);
  const appsMenu = getService('appsMenu');
  const managementMenu = getService('managementMenu');
  const testSubjects = getService('testSubjects');

  describe('security', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
      await PageObjects.common.navigateToApp('home');
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    describe('no management privileges', () => {
      before(async () => {
        await security.testUser.setRoles(['global_dashboard_all'], true);
      });
      after(async () => {
        await security.testUser.restoreDefaults();
      });

      it('should not show the Stack Management nav link', async () => {
        const links = await appsMenu.readLinks();
        expect(links.map((link) => link.text)).to.eql(['Overview', 'Dashboard']);
      });

      it('should render the "application not found" view when navigating to management directly', async () => {
        await PageObjects.common.navigateToApp('management');
        expect(await testSubjects.exists('appNotFoundPageContent')).to.eql(true);
      });
    });

    describe('global all privileges (aka kibana_admin)', () => {
      before(async () => {
        await security.testUser.setRoles(['kibana_admin'], true);
      });
      after(async () => {
        await security.testUser.restoreDefaults();
      });

      it('should show the Stack Management nav link', async () => {
        const links = await appsMenu.readLinks();
        expect(links.map((link) => link.text)).to.contain('Stack Management');
      });

      it('should only render management entries controllable via Kibana privileges', async () => {
        await PageObjects.common.navigateToApp('management');
        const sections = await managementMenu.getSections();
        expect(sections).to.have.length(2);
        expect(sections[0]).to.eql({
          sectionId: 'insightsAndAlerting',
          sectionLinks: ['triggersActions'],
        });
        expect(sections[1]).to.eql({
          sectionId: 'kibana',
          sectionLinks: ['indexPatterns', 'objects', 'tags', 'spaces', 'settings'],
        });
      });
    });
  });
}
