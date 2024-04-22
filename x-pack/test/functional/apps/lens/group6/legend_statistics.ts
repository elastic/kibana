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

  async function goToTimeRangeForXyChart() {
    await PageObjects.lens.goToTimeRange(undefined, 'Sep 22, 2015 @ 23:30:00.000');
  }

  describe('lens persisted and runtime state differences properties', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/legend_statistics'
      );
    });
    describe('xy chart', () => {
      it('shows values in legend for legacy valuesInLegend===true property and saves it correctly', async () => {
        const title = 'xyValuesInLegendTrue';
        await loadSavedLens(title);
        await goToTimeRangeForXyChart();
        await expectLegendOneItem('Count of records', '2');
        await PageObjects.lens.save(title);
        await loadSavedLens(title);
        await goToTimeRangeForXyChart();
        await expectLegendOneItem('Count of records', '2');
      });

      it('does not show values in legend for legacy valuesInLegend===false prop', async () => {
        await loadSavedLens('xyValuesInLegendFalse');
        await goToTimeRangeForXyChart();
        await expectLegendOneItem('Count of records');
      });
      it('shows values in legend for legendStats===["values"] prop', async () => {
        await loadSavedLens('xyLegendStats');
        await goToTimeRangeForXyChart();
        await expectLegendOneItem('Count of records', '2');
      });
    });
    describe('waffle chart', () => {
      it('waffleshows values in legend for legacy valuesInLegend===true property', async () => {
        await loadSavedLens('waffleValuesInLegendTrue');
        await expectLegendOneItem('Count of records', '14,005');
      });
      it('shows values in legend for legacy showValuesInLegend===false prop', async () => {
        await loadSavedLens('waffleValuesInLegendFalse');
        await expectLegendOneItem('Count of records', undefined);
      });
      it('shows values in legend for legendStats===["values"] prop', async () => {
        await loadSavedLens('waffleLegendStats');
        await expectLegendOneItem('Count of records', '14,005');
      });
    });
  });
}
