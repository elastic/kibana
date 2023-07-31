/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const dataGrid = getService('dataGrid');
  const PageObjects = getPageObjects(['common', 'timePicker', 'settings', 'context']);

  async function setAutocompleteUseTimeRange(value: boolean) {
    await PageObjects.settings.navigateTo();
    await PageObjects.settings.clickKibanaSettings();
    await PageObjects.settings.toggleAdvancedSettingCheckbox(
      UI_SETTINGS.AUTOCOMPLETE_USE_TIMERANGE,
      value
    );
  }

  describe('value suggestions', function describeIndexTests() {
    before(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');

      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/dashboard_drilldowns/drilldowns'
      );
      await kibanaServer.uiSettings.update({
        'doc_table:legacy': false,
      });
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await kibanaServer.uiSettings.unset('doc_table:legacy');
      await PageObjects.common.unsetTime();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('useTimeRange enabled', () => {
      before(async () => {
        await setAutocompleteUseTimeRange(true);
      });

      beforeEach(async () => {
        await PageObjects.common.navigateToApp('discover');
      });

      describe('discover', () => {
        afterEach(async () => {
          await queryBar.clearQuery();
        });

        it('dont show up if outside of range', async () => {
          await PageObjects.timePicker.setAbsoluteRange(
            'Mar 1, 2020 @ 00:00:00.000',
            'Nov 1, 2020 @ 00:00:00.000'
          );

          await queryBar.setQuery('extension.raw : ');
          await queryBar.expectSuggestions({ count: 0 });
        });

        it('show up if in range', async () => {
          await PageObjects.timePicker.setDefaultAbsoluteRange();
          await queryBar.setQuery('extension.raw : ');
          await queryBar.expectSuggestions({ count: 5, contains: '"jpg"' });
        });

        it('also displays descriptions for operators', async () => {
          await PageObjects.timePicker.setDefaultAbsoluteRange();
          await queryBar.setQuery('extension.raw');
          await queryBar.expectSuggestionsDescription({ count: 2 });
        });
      });

      describe('context', () => {
        after(async () => {
          await filterBar.removeFilter('geo.dest');
        });

        it('shows all autosuggest options for a filter in discover context app', async () => {
          // Set a good time range
          await PageObjects.timePicker.setDefaultAbsoluteRange();

          // navigate to context
          await dataGrid.clickRowToggle({ rowIndex: 0 });
          const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
          await rowActions[1].click();
          await PageObjects.context.waitUntilContextLoadingHasFinished();

          // Apply filter in context view
          await filterBar.addFilter({ field: 'geo.dest', operation: 'is', value: 'US' });
        });
      });
    });

    describe('useTimeRange disabled', () => {
      before(async () => {
        await setAutocompleteUseTimeRange(false);
      });

      beforeEach(async () => {
        await PageObjects.common.navigateToApp('discover');
      });

      afterEach(async () => {
        await queryBar.clearQuery();
      });

      after(async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSettings();
        await PageObjects.settings.clearAdvancedSettings(UI_SETTINGS.AUTOCOMPLETE_USE_TIMERANGE);
      });

      it('DO show up if outside of range', async () => {
        await PageObjects.timePicker.setAbsoluteRange(
          'Mar 1, 2020 @ 00:00:00.000',
          'Nov 1, 2020 @ 00:00:00.000'
        );

        await queryBar.setQuery('extension.raw : ');
        await queryBar.expectSuggestions({ count: 5, contains: '"jpg"' });
      });

      it('show up', async () => {
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await queryBar.setQuery('extension.raw : ');
        await queryBar.expectSuggestions({ count: 5, contains: '"jpg"' });
      });
    });
  });
}
