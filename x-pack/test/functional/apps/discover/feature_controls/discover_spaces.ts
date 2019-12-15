/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'security',
    'spaceSelector',
  ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  async function setDiscoverTimeRange() {
    await PageObjects.timePicker.setDefaultAbsoluteRange();
  }

  describe('spaces', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('discover/feature_controls/spaces');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('discover/feature_controls/spaces');
      });

      it('shows discover navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.contain('Discover');
      });

      it('shows save button', async () => {
        await PageObjects.common.navigateToApp('discover', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('discoverSaveButton', { timeout: 10000 });
      });

      it('shows "visualize" field button', async () => {
        await PageObjects.common.navigateToApp('discover', {
          basePath: '/s/custom_space',
        });
        await setDiscoverTimeRange();
        await PageObjects.discover.clickFieldListItem('bytes');
        await PageObjects.discover.expectFieldListItemVisualize('bytes');
      });
    });

    describe('space with Discover disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('discover/feature_controls/spaces');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['discover'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('discover/feature_controls/spaces');
      });

      it(`doesn't show discover navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).not.to.contain('Discover');
      });

      it(`redirects to the home page`, async () => {
        // to test whether they're being redirected properly, we first load
        // the discover app in the default space, and then we load up the discover
        // app in the custom space and ensure we end up on the home page
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.common.navigateToUrl('discover', '', {
          basePath: '/s/custom_space',
          shouldLoginIfPrompted: false,
          ensureCurrentUrl: false,
        });
        await PageObjects.spaceSelector.expectHomePage('custom_space');
      });
    });

    describe('space with Visualize disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('spaces/disabled_features');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['visualize'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('spaces/disabled_features');
      });

      it('Does not show the "visualize" field button', async () => {
        await PageObjects.common.navigateToApp('discover', {
          basePath: '/s/custom_space',
        });
        await setDiscoverTimeRange();
        await PageObjects.discover.clickFieldListItem('bytes');
        await PageObjects.discover.expectMissingFieldListItemVisualize('bytes');
      });
    });

    describe('space with index pattern management disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['indexPatterns'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it('Navigates to Kibana home rather than index pattern management when no index patterns exist', async () => {
        await PageObjects.common.navigateToUrl('discover', '', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
        });
        await testSubjects.existOrFail('homeApp', { timeout: 10000 });
      });
    });
  });
}
