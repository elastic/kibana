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
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'infraHome', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('infrastructure spaces', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('space with no features disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it('shows Infrastructure navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Infrastructure');
      });

      it(`Infrastructure app is accessible`, async () => {
        await PageObjects.common.navigateToApp('infraOps', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('~noDataPage');
      });
    });

    describe('space with Infrastructure disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await kibanaServer.savedObjects.cleanStandardList();
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['infrastructure'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it(`doesn't show infrastructure navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).not.to.contain('Infrastructure');
      });

      it(`infrastructure app is inaccessible and Application Not Found message is rendered`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          basePath: '/s/custom_space',
        });
        const messageText = await PageObjects.common.getJsonBodyText();
        expect(messageText).to.eql(
          JSON.stringify({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          })
        );
      });
    });

    describe('space with Logs disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await kibanaServer.savedObjects.cleanStandardList();
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['logs'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it(`Infrastructure app is accessible`, async () => {
        await PageObjects.common.navigateToApp('infraOps', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('~noDataPage');
      });
    });

    describe('space with APM disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await kibanaServer.savedObjects.cleanStandardList();
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['apm'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it(`Infrastructure app is accessible`, async () => {
        await PageObjects.common.navigateToApp('infraOps', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('~noDataPage');
      });
    });
  });
}
