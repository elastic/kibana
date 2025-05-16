/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, timePicker, header } = getPageObjects([
    'visualize',
    'lens',
    'timePicker',
    'header',
  ]);
  const find = getService('find');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const fieldEditor = getService('fieldEditor');
  const retry = getService('retry');
  const es = getService('es');
  const queryBar = getService('queryBar');
  const dataViews = getService('dataViews');

  describe('lens fields list tests', () => {
    for (const datasourceType of ['form-based', 'ad-hoc', 'ad-hoc-no-timefield']) {
      describe(`${datasourceType} datasource`, () => {
        before(async () => {
          await visualize.navigateToNewVisualization();
          await visualize.clickVisType('lens');

          if (datasourceType !== 'form-based') {
            await dataViews.createFromSearchBar({
              name: '*stash*',
              adHoc: true,
              hasTimeField: datasourceType !== 'ad-hoc-no-timefield',
            });
            await dataViews.waitForSwitcherToBe('*stash*');
          }

          if (datasourceType !== 'ad-hoc-no-timefield') {
            await lens.goToTimeRange();
          }

          await retry.try(async () => {
            await dataViews.clickAddFieldFromSearchBar();
            await fieldEditor.setName('runtime_string');
            await fieldEditor.enableValue();
            await fieldEditor.typeScript("emit('abc')");
            await fieldEditor.save();
            await header.waitUntilLoadingHasFinished();
            await testSubjects.missingOrFail('fieldEditor');
          });
        });
        it('should show all fields as available', async () => {
          expect(
            await (await testSubjects.find('lnsIndexPatternAvailableFields-count')).getVisibleText()
          ).to.eql(50);
        });

        it('should show a histogram and top values popover for numeric field', async () => {
          const [fieldId] = await lens.findFieldIdsByType('number');
          await log.debug(`Opening field stats for ${fieldId}`);
          await testSubjects.click(fieldId);
          // check for popover
          await testSubjects.exists('lnsFieldListPanel-title');
          // check for top values chart
          await testSubjects.existOrFail('lnsFieldListPanel-topValues');
          const topValuesRows = await testSubjects.findAll('lnsFieldListPanel-topValues-bucket');
          expect(topValuesRows.length).to.eql(11);
          // check for the Other entry
          expect(await topValuesRows[10].getVisibleText()).to.eql('Other\n96.7%');
          // switch to date histogram
          await testSubjects.click('lnsFieldListPanel-buttonGroup-distributionButton');
          // check for date histogram chart
          expect(
            await find.existsByCssSelector(
              '[data-test-subj="lnsFieldListPanelFieldContent"] .echChart'
            )
          ).to.eql(true);
        });

        it('should show a top values popover for a keyword field', async () => {
          const [fieldId] = await lens.findFieldIdsByType('keyword');
          await log.debug(`Opening field stats for ${fieldId}`);
          await testSubjects.click(fieldId);
          // check for popover
          await testSubjects.exists('lnsFieldListPanel-title');
          // check for top values chart
          await testSubjects.existOrFail('lnsFieldListPanel-topValues');
          const topValuesRows = await testSubjects.findAll('lnsFieldListPanel-topValues-bucket');
          expect(topValuesRows.length).to.eql(11);
          // check for the Other entry
          expect(await topValuesRows[10].getVisibleText()).to.eql('Other\n99.9%');
          // check no date histogram
          expect(
            await find.existsByCssSelector(
              '[data-test-subj="lnsFieldListPanelFieldContent"] .echChart'
            )
          ).to.eql(false);
        });

        it('should show a date histogram popover for a date field', async () => {
          const [fieldId] = await lens.findFieldIdsByType('date');
          await log.debug(`Opening field stats for ${fieldId}`);
          await testSubjects.click(fieldId);
          // check for popover
          await testSubjects.exists('lnsFieldListPanel-title');
          // check for date histogram chart
          expect(
            await find.existsByCssSelector(
              '[data-test-subj="lnsFieldListPanelFieldContent"] .echChart'
            )
          ).to.eql(true);
          // check no top values chart
          await testSubjects.missingOrFail('lnsFieldListPanel-buttonGroup-topValuesButton');
        });

        it('should show examples for geo points field', async () => {
          const [fieldId] = await lens.findFieldIdsByType('geo_point');
          await log.debug(`Opening field stats for ${fieldId}`);
          await testSubjects.click(fieldId);
          // check for top values chart
          await testSubjects.existOrFail('lnsFieldListPanel-topValues');
          const topValuesRows = await testSubjects.findAll('lnsFieldListPanel-topValues-bucket');
          expect(topValuesRows.length).to.eql(11);
        });

        it('should show stats for a numeric runtime field', async () => {
          await lens.searchField('runtime');
          await lens.waitForMissingField('Records');
          await lens.waitForField('runtime_number');
          const [fieldId] = await lens.findFieldIdsByType('number');
          await log.debug(`Opening field stats for ${fieldId}`);
          await testSubjects.click(fieldId);
          // check for popover
          await testSubjects.exists('lnsFieldListPanel-title');
          // check for top values chart
          await testSubjects.existOrFail('lnsFieldListPanel-topValues');
          // check values
          const topValuesRows = await testSubjects.findAll('lnsFieldListPanel-topValues-bucket');
          expect(topValuesRows.length).to.eql(11);
          // check for the Other entry
          expect(await topValuesRows[10].getVisibleText()).to.eql('Other\n96.7%');
          // switch to date histogram
          await testSubjects.click('lnsFieldListPanel-buttonGroup-distributionButton');
          // check for date histogram chart
          expect(
            await find.existsByCssSelector(
              '[data-test-subj="lnsFieldListPanelFieldContent"] .echChart'
            )
          ).to.eql(true);
        });

        it('should show stats for a keyword runtime field', async () => {
          await lens.searchField('runtime');
          await lens.waitForField('runtime_string');
          const [fieldId] = await lens.findFieldIdsByType('keyword');
          await log.debug(`Opening field stats for ${fieldId}`);
          await testSubjects.click(fieldId);
          // check for popover
          await testSubjects.exists('lnsFieldListPanel-title');
          // check for top values chart
          await testSubjects.existOrFail('lnsFieldListPanel-topValues');
          // check no date histogram
          expect(
            await find.existsByCssSelector(
              '[data-test-subj="lnsFieldListPanelFieldContent"] .echChart'
            )
          ).to.eql(false);
          await lens.searchField('');
        });

        it('should change popover content if user defines a filter that affects field values', async () => {
          // check the current records count for stats
          const [fieldId] = await lens.findFieldIdsByType('keyword');
          await log.debug(`Opening field stats for ${fieldId}`);
          await testSubjects.click(fieldId);
          const valuesCount = parseInt(
            (await testSubjects.getVisibleText('lnsFieldListPanel-statsFooter'))
              .replaceAll(/(Calculated from | records\.)/g, '')
              .replace(',', ''),
            10
          );
          // define a filter
          await filterBar.addFilter({ field: 'geo.src', operation: 'is', value: 'CN' });
          await retry.waitFor('Wait for the filter to take effect', async () => {
            await testSubjects.click(fieldId);
            // check for top values chart has changed compared to the previous test
            const newValuesCount = parseInt(
              (await testSubjects.getVisibleText('lnsFieldListPanel-statsFooter'))
                .replaceAll(/(Calculated from | records\.)/g, '')
                .replace(',', ''),
              10
            );
            return newValuesCount < valuesCount;
          });
        });

        // One Fields cap's limitation is to not know when an index has no fields based on filters
        it('should detect fields have no data in popup if filter excludes them', async () => {
          await filterBar.removeAllFilters();
          await filterBar.addFilter({ field: 'bytes', operation: 'is', value: '-1' });
          // check via popup fields have no data
          const [fieldId] = await lens.findFieldIdsByType('keyword');
          await log.debug(`Opening field stats for ${fieldId}`);
          await retry.try(async () => {
            await testSubjects.click(fieldId);
            expect(await testSubjects.find('lnsFieldListPanel-missingFieldStats')).to.be.ok();
            // close the popover
            await testSubjects.click(fieldId);
          });
        });

        if (datasourceType !== 'ad-hoc-no-timefield') {
          it('should move some fields as empty when the time range excludes them', async () => {
            // remove the filter
            await filterBar.removeAllFilters();
            // tweak the time range to 17 Sept 2015 to 18 Sept 2015
            await lens.goToTimeRange('Sep 17, 2015 @ 06:31:44.000', 'Sep 18, 2015 @ 06:31:44.000');
            // check all fields are empty now
            expect(
              await (await testSubjects.find('lnsIndexPatternEmptyFields-count')).getVisibleText()
            ).to.eql(52);
            // check avaialble count is 0
            expect(
              await (
                await testSubjects.find('lnsIndexPatternAvailableFields-count')
              ).getVisibleText()
            ).to.eql(1);
          });
        }
      });
    }

    describe(`update field list test`, () => {
      before(async () => {
        await es.transport.request({
          path: '/field-update-test/_doc',
          method: 'POST',
          body: {
            '@timestamp': new Date().toISOString(),
            oldField: 10,
          },
        });
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await timePicker.setCommonlyUsedTime('This_week');

        await dataViews.createFromSearchBar({
          name: 'field-update-test',
          adHoc: true,
          hasTimeField: true,
        });
        await dataViews.waitForSwitcherToBe('field-update-test*');
      });
      after(async () => {
        await es.transport.request({
          path: '/field-update-test',
          method: 'DELETE',
        });
        await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      });

      it('should show new fields Available fields', async () => {
        await es.transport.request({
          path: '/field-update-test/_doc?refresh=true',
          method: 'POST',
          body: {
            '@timestamp': new Date().toISOString(),
            oldField: 20,
            newField: 20,
          },
        });

        await lens.waitForField('oldField');
        await queryBar.setQuery('oldField: 20');
        await queryBar.submitQuery();
        await header.waitUntilLoadingHasFinished();
        await lens.waitForField('newField');
      });
    });
  });
}
