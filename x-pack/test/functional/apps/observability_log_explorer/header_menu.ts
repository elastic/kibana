/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const config = getService('config');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['discover', 'observabilityLogExplorer', 'timePicker']);

  describe('Header menu', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/functional/es_archives/observability_log_explorer/data_streams'
      );
      await PageObjects.observabilityLogExplorer.navigateTo();
    });

    after(async () => {
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
        const timeConfig = await PageObjects.timePicker.getTimeConfig();

        // Set query bar value
        await PageObjects.observabilityLogExplorer.submitQuery('*favicon*');

        const discoverLink = await PageObjects.observabilityLogExplorer.getDiscoverFallbackLink();
        discoverLink.click();

        await PageObjects.discover.waitForDocTableLoadingComplete();

        await retry.try(async () => {
          expect(
            await (
              await testSubjects.find(
                'discover-dataView-switch-link',
                config.get('timeouts.find') * 10
              )
            ).getVisibleText()
          ).to.eql('All log datasets');
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
