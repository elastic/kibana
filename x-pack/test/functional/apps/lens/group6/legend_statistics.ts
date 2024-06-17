/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const find = getService('find');
  const listingTable = getService('listingTable');
  const kibanaServer = getService('kibanaServer');

  async function loadSavedLens(title: string) {
    await PageObjects.visualize.gotoVisualizationLandingPage();
    await listingTable.searchForItemWithName(title);
    await PageObjects.lens.clickVisualizeListItemTitle(title);
  }

  async function expectLegendOneItem(name: string, value?: string) {
    const expectedText = value ? `${name}\n${value}` : name;
    const legendElement = await find.byCssSelector('.echLegendItem');
    const text = await legendElement.getVisibleText();
    expect(text).to.eql(expectedText);
  }

  describe('lens legend statistics', () => {
    describe('lens persisted and runtime state differences properties', () => {
      before(async () => {
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/lens/legend_statistics'
        );
        await kibanaServer.uiSettings.update({
          'timepicker:timeDefaults':
            '{  "from": "2015-09-18T19:37:13.000Z",  "to": "2015-09-22T23:30:30.000Z"}',
        });
        await PageObjects.visualize.gotoVisualizationLandingPage({ forceRefresh: true });
      });

      after(async () => {
        await kibanaServer.uiSettings.unset('timepicker:timeDefaults');
      });
      describe('xy chart', () => {
        it('shows values in legend for legacy valuesInLegend===true property and saves it correctly', async () => {
          const title = 'xyValuesInLegendTrue';
          await loadSavedLens(title);
          await expectLegendOneItem('Count of records', '2');
          await PageObjects.lens.save(title);
          await loadSavedLens(title);
          await expectLegendOneItem('Count of records', '2');
        });

        it('does not show values in legend for legacy valuesInLegend===false prop', async () => {
          await loadSavedLens('xyValuesInLegendFalse');
          await expectLegendOneItem('Count of records');
        });
        it('shows values in legend for legendStats===["values"] prop', async () => {
          await loadSavedLens('xyLegendStats');
          await expectLegendOneItem('Count of records', '2');
        });
      });
      describe('waffle chart', () => {
        it('waffleshows values in legend for legacy valuesInLegend===true property', async () => {
          await loadSavedLens('waffleValuesInLegendTrue');
          await expectLegendOneItem('Count of records', '14,003');
        });
        it('shows values in legend for legacy showValuesInLegend===false prop', async () => {
          await loadSavedLens('waffleValuesInLegendFalse');
          await expectLegendOneItem('Count of records', undefined);
        });
        it('shows values in legend for legendStats===["values"] prop', async () => {
          await loadSavedLens('waffleLegendStats');
          await expectLegendOneItem('Count of records', '14,003');
        });
      });
    });
  });
}
