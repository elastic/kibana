/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { SpacesService } from 'x-pack/test/common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// tslint:disable:no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const spacesService: SpacesService = getService('spaces');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');

  describe('discover', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('spaces/disabled_features');
        await kibanaServer.uiSettings.replace({
          'accessibility:disableAnimations': true,
          'telemetry:optIn': false,
          defaultIndex: 'logstash-*',
        });
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('spaces/disabled_features');
      });

      it('shows discover navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = await PageObjects.common.getAppNavLinksText();
        expect(navLinks).to.contain('Discover');
      });

      it('shows save button', async () => {
        await PageObjects.common.navigateToApp('discover', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('discoverSaveButton', 10000);
      });
    });

    describe('space with Discover disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('spaces/disabled_features');
        await kibanaServer.uiSettings.replace({
          'accessibility:disableAnimations': true,
          'telemetry:optIn': false,
          defaultIndex: 'logstash-*',
        });
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['discover'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('spaces/disabled_features');
      });

      it(`doesn't show discover navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = await PageObjects.common.getAppNavLinksText();
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
  });
}
