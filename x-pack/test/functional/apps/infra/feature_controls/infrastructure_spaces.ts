/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { DATES } from '../constants';

const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'infraHome', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const retry = getService('retry');

  describe('infrastructure spaces', () => {
    before(async () => {
      await esArchiver.load('infra/metrics_and_logs');
    });

    after(async () => {
      await esArchiver.unload('infra/metrics_and_logs');
    });

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

      it('shows Metrics navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.contain('Metrics');
      });

      it(`landing page shows Wafflemap`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: true,
        });
        await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await testSubjects.existOrFail('~waffleMap');
      });

      describe('context menu', () => {
        before(async () => {
          await testSubjects.click('~nodeContainer');
        });

        it(`shows link to view logs`, async () => {
          await retry.waitFor('context menu', () => testSubjects.exists('~nodeContextMenu'));
          await testSubjects.existOrFail('~viewLogsContextMenuItem');
        });

        it(`shows link to view apm traces`, async () => {
          await retry.waitFor('context menu', () => testSubjects.exists('~nodeContextMenu'));
          await testSubjects.existOrFail('~viewApmTracesContextMenuItem');
        });
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
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).not.to.contain('Metrics');
      });

      it(`infrastructure root renders not found page`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', '', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('~infraNotFoundPage');
      });

      it(`infrastructure home page renders not found page`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('~infraNotFoundPage');
      });

      it(`infrastructure landing page renders not found page`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', 'infrastructure', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('~infraNotFoundPage');
      });

      it(`infrastructure snapshot page renders not found page`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', 'infrastructure/inventory', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('~infraNotFoundPage');
      });

      it(`metrics page renders not found page`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'infraOps',
          '/infrastructure/metrics/host/demo-stack-redis-01',
          {
            basePath: '/s/custom_space',
            ensureCurrentUrl: true,
          }
        );
        await testSubjects.existOrFail('~infraNotFoundPage');
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

      it(`landing page shows Wafflemap`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: true,
        });
        await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await testSubjects.existOrFail('~waffleMap');
      });

      describe('context menu', () => {
        before(async () => {
          await testSubjects.click('~nodeContainer');
        });

        it(`doesn't show link to view logs`, async () => {
          await retry.waitFor('context menu', () => testSubjects.exists('~nodeContextMenu'));
          await testSubjects.missingOrFail('~viewLogsContextMenuItem');
        });

        it(`shows link to view apm traces`, async () => {
          await retry.waitFor('context menu', () => testSubjects.exists('~nodeContextMenu'));
          await testSubjects.existOrFail('~viewApmTracesContextMenuItem');
        });
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

      it(`landing page shows Wafflemap`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: true,
        });
        await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await testSubjects.existOrFail('~waffleMap');
      });

      describe('context menu', () => {
        before(async () => {
          await testSubjects.click('~nodeContainer');
        });

        it(`shows link to view logs`, async () => {
          await retry.waitFor('context menu', () => testSubjects.exists('~nodeContextMenu'));
          await testSubjects.existOrFail('~viewLogsContextMenuItem');
        });

        it(`doesn't show link to view apm traces`, async () => {
          await retry.waitFor('context menu', () => testSubjects.exists('~nodeContextMenu'));
          await testSubjects.missingOrFail('~viewApmTracesContextMenuItem');
        });
      });
    });
  });
}
