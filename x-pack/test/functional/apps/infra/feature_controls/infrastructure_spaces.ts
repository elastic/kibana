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
    'infraHome',
    'security',
    'spaceSelector',
    'settings',
  ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('infrastructure spaces', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
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

      it('shows Metrics navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        await PageObjects.settings.setNavType('individual');
        const navLinks = (await appsMenu.readLinks()).map(link => link.text);
        expect(navLinks).to.contain('Metrics');
      });

      it(`Metrics app is accessible`, async () => {
        await PageObjects.common.navigateToApp('infraOps', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('~noMetricsIndicesPrompt');
      });
    });

    describe('space with Infrastructure disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('empty_kibana');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['infrastructure'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('empty_kibana');
      });

      it(`doesn't show metrics navlink`, async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(link => link.text);
        expect(navLinks).not.to.contain('Metrics');
      });

      it(`metrics app is inaccessible and Application Not Found message is rendered`, async () => {
        await PageObjects.common.navigateToApp('infraOps', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('~appNotFoundPageContent');
        await PageObjects.common.navigateToUrlWithBrowserHistory(
          'infraOps',
          '/inventory',
          undefined,
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('~appNotFoundPageContent');
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

      it(`Metrics app is accessible`, async () => {
        await PageObjects.common.navigateToApp('infraOps', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('~noMetricsIndicesPrompt');
      });
    });

    describe('space with APM disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('empty_kibana');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['apm'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('empty_kibana');
      });

      it(`Metrics app is accessible`, async () => {
        await PageObjects.common.navigateToApp('infraOps', {
          basePath: '/s/custom_space',
        });
        await testSubjects.existOrFail('~noMetricsIndicesPrompt');
      });
    });
  });
}
