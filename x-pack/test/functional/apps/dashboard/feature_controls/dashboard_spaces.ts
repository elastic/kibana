/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
// eslint-disable-next-line max-len
import {
  createDashboardEditUrl,
  DashboardConstants,
} from '../../../../../../src/legacy/core_plugins/kibana/public/dashboard/dashboard_constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'dashboard', 'security', 'spaceSelector']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');

  describe('spaces', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('dashboard/feature_controls/spaces');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('dashboard/feature_controls/spaces');
      });

      it('shows dashboard navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.contain('Dashboard');
      });

      it(`landing page shows "Create new Dashboard" button`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          DashboardConstants.LANDING_PAGE_PATH,
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('dashboardLandingPage', { timeout: 10000 });
        await testSubjects.existOrFail('newItemButton');
      });

      it(`create new dashboard shows addNew button`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          DashboardConstants.CREATE_NEW_DASHBOARD_URL,
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('emptyDashboardAddPanelButton', { timeout: 10000 });
      });

      it(`can view existing Dashboard`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', createDashboardEditUrl('i-exist'), {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('embeddablePanelHeading-APie', { timeout: 10000 });
      });
    });

    describe('space with Dashboard disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('dashboard/feature_controls/spaces');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['dashboard'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('dashboard/feature_controls/spaces');
      });

      it(`doesn't show dashboard navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).not.to.contain('Dashboard');
      });

      it(`create new dashboard redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          DashboardConstants.CREATE_NEW_DASHBOARD_URL,
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('homeApp', { timeout: 10000 });
      });

      it(`edit dashboard for object which doesn't exist redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          createDashboardEditUrl('i-dont-exist'),
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('homeApp', { timeout: 10000 });
      });

      it(`edit dashboard for object which exists redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', createDashboardEditUrl('i-exist'), {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', { timeout: 10000 });
      });
    });
  });
}
