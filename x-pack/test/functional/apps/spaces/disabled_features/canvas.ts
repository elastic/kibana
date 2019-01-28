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
  const PageObjects = getPageObjects(['common', 'canvas', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');

  describe('canvas', () => {
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

      it('shows canvas navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = await PageObjects.common.getAppNavLinksText();
        expect(navLinks).to.contain('Canvas');
      });

      it(`landing page shows "Create new workpad" button`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.canvas.expectCreateWorkpadButtonEnabled();
      });

      it(`allows a workpad to be created`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', 'workpad/create', {
          ensureCurrentUrl: true,
          shouldLoginIfPrompted: false,
        });

        await PageObjects.canvas.expectAddElementButton();
      });

      it(`allows a workpad to be edited`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'canvas',
          'workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31',
          {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          }
        );

        await PageObjects.canvas.expectAddElementButton();
      });
    });

    describe('space with Canvas disabled', () => {
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
          disabledFeatures: ['canvas'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('spaces/disabled_features');
      });

      it(`doesn't show canvas navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = await PageObjects.common.getAppNavLinksText();
        expect(navLinks).not.to.contain('Canvas');
      });

      it(`create new workpad redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', 'workpad/create', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });

      it(`edit workpad redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'canvas',
          'workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31',
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('homeApp', 10000);
      });
    });
  });
}
