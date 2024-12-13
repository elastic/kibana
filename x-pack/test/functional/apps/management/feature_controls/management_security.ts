/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'settings', 'security']);
  const appsMenu = getService('appsMenu');
  const managementMenu = getService('managementMenu');
  const testSubjects = getService('testSubjects');

  describe('security', function () {
    this.tags('skipFIPS');
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await PageObjects.common.navigateToApp('home');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('no management privileges', function () {
      this.tags('skipFIPS');
      before(async () => {
        await security.testUser.setRoles(['global_dashboard_read']);
      });
      after(async () => {
        await security.testUser.restoreDefaults();
      });

      it('should not show the Stack Management nav link', async () => {
        const links = await appsMenu.readLinks();
        expect(links.map((link) => link.text)).to.eql(['Dashboards']);
      });

      it('should render the "application not found" view when navigating to management directly', async () => {
        await PageObjects.common.navigateToApp('management');
        expect(await testSubjects.exists('appNotFoundPageContent')).to.eql(true);
      });
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

      it('should only render management entries controllable via Kibana privileges', async () => {
        await PageObjects.common.navigateToApp('management');
        const sections = await managementMenu.getSections();
        expect(sections).to.have.length(3);
        expect(sections[0]).to.eql({ sectionId: 'data', sectionLinks: ['data_quality'] });
        expect(sections[1]).to.eql({
          sectionId: 'insightsAndAlerting',
          sectionLinks: [
            'triggersActionsAlerts',
            'triggersActions',
            'cases',
            'triggersActionsConnectors',
            'reporting',
            'jobsListLink',
            'maintenanceWindows',
          ],
        });
        expect(sections[2]).to.eql({
          sectionId: 'kibana',
          sectionLinks: [
            'dataViews',
            'filesManagement',
            'aiAssistantManagementSelection',
            'objects',
            'tags',
            'search_sessions',
            'spaces',
            'settings',
          ],
        });
      });
    });
  });
}
