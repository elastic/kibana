/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { lens, timePicker, dashboard } = getPageObjects(['lens', 'timePicker', 'dashboard']);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const panelActions = getService('dashboardPanelActions');
  const kibanaServer = getService('kibanaServer');

  describe('Top N', function describeIndexTests() {
    const fixture =
      'x-pack/test_serverless/functional/fixtures/kbn_archiver/lens/open_in_lens/tsvb/top_n.json';

    before(async () => {
      await kibanaServer.importExport.load(fixture);
    });

    after(async () => {
      await kibanaServer.importExport.unload(fixture);
    });

    beforeEach(async () => {
      await dashboard.navigateToApp(); // required for svl until dashboard PO navigation is fixed
      await dashboard.gotoDashboardEditMode('Convert to Lens - TSVB - Top N');
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should show the "Convert to Lens" menu item for a count aggregation', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - Basic');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(true);
    });

    it('should not allow converting of invalid panel', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - Invalid panel');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting of unsupported aggregations', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - Unsupported agg');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should hide the "Convert to Lens" menu item for a sibling pipeline aggregations', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - Sibling pipeline agg');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should hide the "Convert to Lens" menu item for a parent pipeline aggregations', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - Parent pipeline agg');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should convert to horizontal bar', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - Horizontal bar');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      const chartSwitcher = await testSubjects.find('lnsChartSwitchPopover');
      const type = await chartSwitcher.getVisibleText();
      expect(type).to.be('Bar horizontal');
      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);

        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(yDimensionText).to.be('Maximum of memory');
      });
    });

    it('should convert group by to vertical axis', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - Group by');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);

        const xDimensionText = await lens.getDimensionTriggerText('lnsXY_xDimensionPanel', 0);
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(xDimensionText).to.be('Top 10 values of extension.raw');
        expect(yDimensionText).to.be('Count of records');
      });
    });

    it('should convert last value mode to reduced time range', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - Last value');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      await testSubjects.click('indexPattern-advanced-accordion');
      const reducedTimeRange = await testSubjects.find('indexPattern-dimension-reducedTimeRange');
      expect(await reducedTimeRange.getVisibleText()).to.be('1 minute (1m)');
      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(yDimensionText).to.be('Count of records last 1m');
      });
    });

    it('should convert static value to the separate layer with y dimension', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - Static value');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(2);
        const yDimensionText1 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        const yDimensionText2 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 1);
        expect(yDimensionText1).to.be('Count of records');
        expect(yDimensionText2).to.be('10');
      });
    });

    it('visualizes field to Lens and loads fields to the dimesion editor', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - Basic');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(yDimensionText).to.be('Count of records');
      });
    });

    it('should preserve app filters in lens', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - With filter');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      expect(await filterBar.hasFilter('extension', 'css')).to.be(true);
    });

    it('should preserve query in lens', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - With query');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      expect(await queryBar.getQueryString()).to.equal('machine.os : ios');
    });

    it('should bring the ignore global filters configured at series level over', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - Ignore global filters series');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');
      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });

    it('should bring the ignore global filters configured at panel level over', async () => {
      const visPanel = await panelActions.getPanelHeading('Top N - Ignore global filters panel');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');
      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });
  });
}
