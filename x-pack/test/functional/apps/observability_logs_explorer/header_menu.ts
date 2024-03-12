/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from './config';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['discover', 'observabilityLogsExplorer', 'timePicker']);

  describe('Header menu', () => {
    before(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.load(
        'x-pack/test/functional/es_archives/observability_logs_explorer/data_streams'
      );
      await PageObjects.observabilityLogsExplorer.navigateTo();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/observability_logs_explorer/data_streams'
      );
    });

    it('should inject the app header menu on the top navbar', async () => {
      const headerMenu = await PageObjects.observabilityLogsExplorer.getHeaderMenu();
      expect(await headerMenu.isDisplayed()).to.be(true);
    });

    describe('Discover fallback link', () => {
      before(async () => {
        await PageObjects.observabilityLogsExplorer.navigateTo();
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

        await retry.try(async () => {
          expect(await PageObjects.discover.getCurrentlySelectedDataView()).to.eql('All logs');
        });

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

    describe('Add data link', () => {
      before(async () => {
        await PageObjects.observabilityLogsExplorer.navigateTo();
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
