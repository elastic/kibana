/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['discover', 'observabilityLogExplorer', 'timePicker']);

  describe('Header menu', () => {
    before(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.load(
        'x-pack/test/functional/es_archives/observability_log_explorer/data_streams'
      );
      await PageObjects.observabilityLogExplorer.navigateTo();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/observability_log_explorer/data_streams'
      );
    });

    it('should inject the app header menu on the top navbar', async () => {
      const headerMenu = await PageObjects.observabilityLogExplorer.getHeaderMenu();
      expect(await headerMenu.isDisplayed()).to.be(true);
    });

    describe('Discover fallback link', () => {
      it('should render a button link ', async () => {
        const discoverLink = await PageObjects.observabilityLogExplorer.getDiscoverFallbackLink();
        expect(await discoverLink.isDisplayed()).to.be(true);
      });

      it('should navigate to discover keeping the current columns/filters/query/time/data view', async () => {
        // Set timerange to specific values to match data and retrieve config
        await PageObjects.discover.expandTimeRangeAsSuggestedInNoResultsMessage();

        await retry.try(async () => {
          await testSubjects.existOrFail('superDatePickerstartDatePopoverButton');
          await testSubjects.existOrFail('superDatePickerendDatePopoverButton');
        });

        const timeConfig = await PageObjects.timePicker.getTimeConfig();

        // Set query bar value
        await PageObjects.observabilityLogExplorer.submitQuery('*favicon*');

        const discoverLink = await PageObjects.observabilityLogExplorer.getDiscoverFallbackLink();
        discoverLink.click();

        await PageObjects.discover.waitForDocTableLoadingComplete();

        await retry.try(async () => {
          expect(await PageObjects.discover.getCurrentlySelectedDataView()).to.eql('All logs');
        });

        await retry.try(async () => {
          expect(await PageObjects.discover.getColumnHeaders()).to.eql(['@timestamp', 'message']);
        });

        await retry.try(async () => {
          expect(await PageObjects.timePicker.getTimeConfig()).to.eql(timeConfig);
        });

        await retry.try(async () => {
          expect(await PageObjects.observabilityLogExplorer.getQueryBarValue()).to.eql('*favicon*');
        });
      });
    });
  });
}
