/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'infraHome', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('logs spaces', () => {
    describe('space with no features disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('empty_kibana');

        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('empty_kibana');
      });

      it('shows Logs navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Logs');
      });

      describe('logs landing page without data', () => {
        it(`shows 'Change source configuration' button`, async () => {
          await PageObjects.common.navigateToUrlWithBrowserHistory('infraLogs', '', undefined, {
            basePath: '/s/custom_space',
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await testSubjects.existOrFail('~infraLogsPage');
          await testSubjects.existOrFail('~logsViewSetupInstructionsButton');
          await testSubjects.existOrFail('~configureSourceButton');
        });
      });
    });

    describe('space with Logs disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('empty_kibana');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['logs'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('empty_kibana');
      });

      it(`doesn't show Logs navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.not.contain('Logs');
      });

      it(`logs app is inaccessible and Application Not Found message is rendered`, async () => {
        await PageObjects.common.navigateToActualUrl('infraLogs', '', {
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
  });
}
