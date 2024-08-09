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
  const dataViews = getService('dataViews');
  const PageObjects = getPageObjects([
    'discover',
    'observabilityLogsExplorer',
    'svlCommonPage',
    'timePicker',
    'header',
    'svlCommonNavigation',
  ]);

  // Failing: See https://github.com/elastic/kibana/issues/173165
  describe.skip('Header menu', () => {
    before(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.load(
        'x-pack/test/functional/es_archives/observability_logs_explorer/data_streams'
      );
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await PageObjects.svlCommonPage.loginAsViewer();
      await PageObjects.observabilityLogsExplorer.navigateTo();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/observability_logs_explorer/data_streams'
      );
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    it('should inject the app header menu on the top navbar', async () => {
      const headerMenu = await PageObjects.observabilityLogsExplorer.getHeaderMenu();
      expect(await headerMenu.isDisplayed()).to.be(true);
    });

    describe('Discover fallback link', () => {
      before(async () => {
        await PageObjects.observabilityLogsExplorer.navigateTo({
          pageState: {
            // avoid aligning with the test data, because that's what Discover
            // does later in this test and we wouldn't be able to check the time
            // range state transfer
            time: {
              from: '2023-08-03T00:00:00.000Z',
              to: '2023-08-03T12:00:00.000Z',
              mode: 'absolute',
            },
          },
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should render a button link ', async () => {
        const discoverLink = await PageObjects.observabilityLogsExplorer.getDiscoverFallbackLink();
        expect(await discoverLink.isDisplayed()).to.be(true);
      });

      it('should navigate to discover keeping the current filters/query/time/data view and use fallback columns for virtual columns', async () => {
        await retry.try(async () => {
          await testSubjects.existOrFail('superDatePickerstartDatePopoverButton');
          await testSubjects.existOrFail('superDatePickerendDatePopoverButton');
        });
        const timeConfig = await PageObjects.timePicker.getTimeConfig();
        // Set query bar value
        await PageObjects.observabilityLogsExplorer.submitQuery('*favicon*');

        const discoverLink = await PageObjects.observabilityLogsExplorer.getDiscoverFallbackLink();
        discoverLink.click();

        await PageObjects.discover.waitForDocTableLoadingComplete();

        await dataViews.waitForSwitcherToBe('All logs');

        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql([
            '@timestamp',
            'host.name',
            'service.name',
            'message',
          ]);
        });
        await retry.try(async () => {
          expect(await PageObjects.timePicker.getTimeConfig()).to.eql(timeConfig);
        });
        await retry.try(async () => {
          expect(await PageObjects.observabilityLogsExplorer.getQueryBarValue()).to.eql(
            '*favicon*'
          );
        });
      });
    });

    describe('Discover tabs', () => {
      before(async () => {
        await PageObjects.observabilityLogsExplorer.navigateTo({
          pageState: {
            // avoid aligning with the test data, because that's what Discover
            // does later in this test and we wouldn't be able to check the time
            // range state transfer
            time: {
              from: '2023-08-03T00:00:00.000Z',
              to: '2023-08-03T12:00:00.000Z',
              mode: 'absolute',
            },
          },
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should navigate between discover tabs without keeping the current columns/filters/query/time/data view', async () => {
        await retry.try(async () => {
          await testSubjects.existOrFail('superDatePickerstartDatePopoverButton');
          await testSubjects.existOrFail('superDatePickerendDatePopoverButton');
        });

        const timeConfig = await PageObjects.timePicker.getTimeConfig();

        // Set query bar value
        await PageObjects.observabilityLogsExplorer.submitQuery('*favicon*');

        // go to discover tab
        await testSubjects.click('discoverTab');
        await PageObjects.svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'discover',
        });
        await PageObjects.svlCommonNavigation.breadcrumbs.expectBreadcrumbMissing({
          deepLinkId: 'observability-logs-explorer',
        });
        expect(await browser.getCurrentUrl()).contain('/app/discover');

        await dataViews.waitForSwitcherToBe('All logs');

        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).not.to.eql([
            '@timestamp',
            'content',
            'resource',
          ]);
        });

        await retry.try(async () => {
          expect(await PageObjects.timePicker.getTimeConfig()).not.to.eql(timeConfig);
        });

        await retry.try(async () => {
          expect(await PageObjects.observabilityLogsExplorer.getQueryBarValue()).not.to.eql(
            '*favicon*'
          );
        });

        // go to logs explorer tab
        await testSubjects.click('logsExplorerTab');
        await PageObjects.svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'discover',
        });
        await PageObjects.svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'observability-logs-explorer',
        });
        expect(await browser.getCurrentUrl()).contain('/app/observability-logs-explorer');
      });
    });

    describe('Add data link', () => {
      before(async () => {
        await PageObjects.observabilityLogsExplorer.navigateTo();
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should render a button link ', async () => {
        const onboardingLink = await PageObjects.observabilityLogsExplorer.getOnboardingLink();
        expect(await onboardingLink.isDisplayed()).to.be(true);
      });

      it('should navigate to the observability onboarding overview page', async () => {
        const onboardingLink = await PageObjects.observabilityLogsExplorer.getOnboardingLink();
        onboardingLink.click();

        await retry.try(async () => {
          const url = await browser.getCurrentUrl();
          expect(url).to.contain(`/app/observabilityOnboarding`);
        });
      });
    });
  });
}
