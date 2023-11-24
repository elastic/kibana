/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'discover',
    'observabilityLogExplorer',
    'svlCommonPage',
    'timePicker',
    'header',
    'svlCommonNavigation',
  ]);

  describe('Header menu', () => {
    before(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.load(
        'x-pack/test/functional/es_archives/observability_log_explorer/data_streams'
      );
      await PageObjects.svlCommonPage.login();
      await PageObjects.observabilityLogExplorer.navigateTo();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await PageObjects.svlCommonPage.forceLogout();
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/observability_log_explorer/data_streams'
      );
    });

    it('should inject the app header menu on the top navbar', async () => {
      const headerMenu = await PageObjects.observabilityLogExplorer.getHeaderMenu();
      expect(await headerMenu.isDisplayed()).to.be(true);
    });

    describe('Discover tabs', () => {
      before(async () => {
        await PageObjects.observabilityLogExplorer.navigateTo();
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should navigate between discover tabs keeping the current columns/filters/query/time/data view', async () => {
        await retry.try(async () => {
          await testSubjects.existOrFail('superDatePickerstartDatePopoverButton');
          await testSubjects.existOrFail('superDatePickerendDatePopoverButton');
        });

        const timeConfig = await PageObjects.timePicker.getTimeConfig();

        // Set query bar value
        await PageObjects.observabilityLogExplorer.submitQuery('*favicon*');

        // go to discover tab
        await testSubjects.click('discoverTab');
        await PageObjects.svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'discover',
        });
        await PageObjects.svlCommonNavigation.breadcrumbs.expectBreadcrumbMissing({
          deepLinkId: 'observability-log-explorer',
        });
        expect(await browser.getCurrentUrl()).contain('/app/discover');

        await PageObjects.discover.waitForDocTableLoadingComplete();

        await retry.try(async () => {
          expect(await PageObjects.discover.getCurrentlySelectedDataView()).to.eql('All logs');
        });

        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql([
            '@timestamp',
            'service.name',
            'host.name',
            'message',
          ]);
        });

        await retry.try(async () => {
          expect(await PageObjects.timePicker.getTimeConfig()).to.eql(timeConfig);
        });

        await retry.try(async () => {
          expect(await PageObjects.observabilityLogExplorer.getQueryBarValue()).to.eql('*favicon*');
        });

        // go to log explorer tab
        await testSubjects.click('logExplorerTab');
        await PageObjects.svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'discover',
        });
        await PageObjects.svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'observability-log-explorer',
        });
        expect(await browser.getCurrentUrl()).contain('/app/observability-log-explorer');
      });
    });

    describe('Add data link', () => {
      before(async () => {
        await PageObjects.observabilityLogExplorer.navigateTo();
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should render a button link ', async () => {
        const onboardingLink = await PageObjects.observabilityLogExplorer.getOnboardingLink();
        expect(await onboardingLink.isDisplayed()).to.be(true);
      });

      it('should navigate to the observability onboarding overview page', async () => {
        const onboardingLink = await PageObjects.observabilityLogExplorer.getOnboardingLink();
        onboardingLink.click();

        await retry.try(async () => {
          const url = await browser.getCurrentUrl();
          expect(url).to.contain(`/app/observabilityOnboarding`);
        });
      });
    });
  });
}
