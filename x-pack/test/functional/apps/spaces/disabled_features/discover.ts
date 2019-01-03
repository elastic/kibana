/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { SpacesService } from 'x-pack/test/common/services';
import { TestInvoker } from '../lib/types';

// tslint:disable:no-default-export
export default function({ getPageObjects, getService }: TestInvoker) {
  const esArchiver = getService('esArchiver');
  const spacesService: SpacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'discover', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');

  const getAppNavLinks = async () => {
    const appSwitcher = await testSubjects.find('appSwitcher');
    const appLinks = await testSubjects.findAllDescendant('appLink', appSwitcher);
    const linksText = await Promise.all(appLinks.map((appLink: any) => appLink.getVisibleText()));
    return linksText;
  };

  describe('discover', () => {
    before(async () => {
      await esArchiver.load('spaces/disabled_features');
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('security/feature_privileges');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
        await PageObjects.security.login(null, null, {
          expectSpaceSelector: true,
        });
        await PageObjects.spaceSelector.clickSpaceCard('custom_space');
        await PageObjects.spaceSelector.expectHomePage('custom_space');
      });

      after(async () => {
        await PageObjects.security.logout();
        await spacesService.delete('custom_space');
      });

      it('shows discover navlink', async () => {
        const navLinks = await getAppNavLinks();
        expect(navLinks).to.contain('Discover');
      });

      it('shows save button', async () => {
        await PageObjects.common.navigateToUrl('discover', '', {
          basePath: '/s/custom_space',
          loginIfPrompted: false,
        });
        await testSubjects.existOrFail('discoverSaveButton');
      });
    });

    describe('space with Discover disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['discover'],
        });
        await PageObjects.security.login(null, null, {
          expectSpaceSelector: true,
        });
        await PageObjects.spaceSelector.clickSpaceCard('custom_space');
        await PageObjects.spaceSelector.expectHomePage('custom_space');
      });

      after(async () => {
        await PageObjects.security.logout();
        await spacesService.delete('custom_space');
      });

      it(`doesn't show discover navlink`, async () => {
        const navLinks = await getAppNavLinks();
        expect(navLinks).not.to.contain('Discover');
      });

      it(`redirects to the home page`, async () => {
        await PageObjects.common.navigateToUrl('discover', '', {
          basePath: '/s/custom_space',
          loginIfPrompted: false,
        });
        await PageObjects.spaceSelector.expectHomePage('custom_space');
      });
    });
  });
}
