/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const config = getService('config');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'dashboard', 'security', 'spaceSelector', 'error']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');

  describe('spaces', () => {
    const customSpace = 'custom_space';
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        await spacesService.create({
          id: customSpace,
          name: customSpace,
          disabledFeatures: [],
        });
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/dashboard/feature_controls/custom_space',
          { space: customSpace }
        );
      });

      after(async () => await spacesService.delete(customSpace));

      it('shows dashboard navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Dashboards');
      });

      it(`landing page shows "Create new Dashboard" button`, async () => {
        await PageObjects.dashboard.gotoDashboardListingURL({
          args: {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          },
        });
        await testSubjects.existOrFail('dashboardLandingPage', {
          timeout: config.get('timeouts.waitFor'),
        });
        await testSubjects.existOrFail('newItemButton');
      });

      it(`create new dashboard shows addNew button`, async () => {
        await PageObjects.dashboard.gotoDashboardURL({
          args: {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          },
        });
        await testSubjects.existOrFail('emptyDashboardWidget', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it(`can view existing Dashboard`, async () => {
        await PageObjects.dashboard.gotoDashboardURL({
          id: '8fba09d8-df3f-5aa1-83cc-65f7fbcbc0d9',
          args: {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          },
        });
        await testSubjects.existOrFail('embeddablePanelHeading-APie', {
          timeout: config.get('timeouts.waitFor'),
        });
      });
    });

    describe('space with Dashboard disabled', () => {
      before(async () => {
        await spacesService.create({
          id: customSpace,
          name: customSpace,
          disabledFeatures: ['dashboard'],
        });
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/dashboard/feature_controls/custom_space',
          { space: customSpace }
        );
      });

      after(async () => await spacesService.delete('custom_space'));

      it(`doesn't show dashboard navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).not.to.contain('Dashboard');
      });

      it(`create new dashboard shows 404`, async () => {
        await PageObjects.dashboard.gotoDashboardURL({
          args: {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          },
        });
        await PageObjects.error.expectNotFound();
      });

      it(`edit dashboard for object which doesn't exist shows 404`, async () => {
        await PageObjects.dashboard.gotoDashboardURL({
          id: 'i-dont-exist',
          args: {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          },
        });
        await PageObjects.error.expectNotFound();
      });

      it(`edit dashboard for object which exists shows 404`, async () => {
        await PageObjects.dashboard.gotoDashboardURL({
          id: 'i-exist',
          args: {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          },
        });
        await PageObjects.error.expectNotFound();
      });
    });
  });
}
