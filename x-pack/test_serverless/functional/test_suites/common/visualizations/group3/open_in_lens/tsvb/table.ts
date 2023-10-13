/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  const panelActions = getService('dashboardPanelActions');
  const kibanaServer = getService('kibanaServer');

  describe('Table', function describeIndexTests() {
    const fixture =
      'x-pack/test_serverless/functional/fixtures/kbn_archiver/lens/open_in_lens/tsvb/table.json';

    before(async () => {
      await kibanaServer.importExport.load(fixture);
    });

    after(async () => {
      await kibanaServer.importExport.unload(fixture);
    });

    beforeEach(async () => {
      await dashboard.navigateToApp(); // required for svl until dashboard PO navigation is fixed
      await dashboard.gotoDashboardEditMode('Convert to Lens - TSVB - Table');
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should allow converting a count aggregation', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - Basic');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(true);
    });

    it('should not allow converting of not valid panel', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - Invalid panel');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting of unsupported aggregations', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - Unsupported agg');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting sibling pipeline aggregations', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - Sibling pipeline agg');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting parent pipeline aggregations', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - Parent pipeline agg');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting invalid aggregation function', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - Invalid agg');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting series with different aggregation function or aggregation by', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - Different agg function');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should convert last value mode to reduced time range', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - Last value mode');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('lnsDataTable');

      await lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
      await testSubjects.click('indexPattern-advanced-accordion');
      const reducedTimeRange = await testSubjects.find('indexPattern-dimension-reducedTimeRange');
      expect(await reducedTimeRange.getVisibleText()).to.be('1 minute (1m)');
      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);
        const metricDimensionText = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0);
        expect(metricDimensionText).to.be('Count of records last 1m');
      });
    });

    it('should convert static value to the metric dimension', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - Static value');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('lnsDataTable');

      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);
        const metricDimensionText1 = await lens.getDimensionTriggerText('lnsDatatable_metrics', 0);
        const metricDimensionText2 = await lens.getDimensionTriggerText('lnsDatatable_metrics', 1);
        expect(metricDimensionText1).to.be('Count of records');
        expect(metricDimensionText2).to.be('10');
      });
    });

    it('should convert aggregate by to split row dimension', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - Agg by');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('lnsDataTable');

      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);
        const splitRowsText1 = await lens.getDimensionTriggerText('lnsDatatable_rows', 0);
        const splitRowsText2 = await lens.getDimensionTriggerText('lnsDatatable_rows', 1);
        expect(splitRowsText1).to.be('Top 10 values of machine.os.raw');
        expect(splitRowsText2).to.be('Top 10 values of clientip');
      });

      await lens.openDimensionEditor('lnsDatatable_rows > lns-dimensionTrigger', 0, 1);
      const collapseBy = await testSubjects.find('indexPattern-collapse-by');
      expect(await collapseBy.getAttribute('value')).to.be('sum');
    });

    it('should convert group by field with custom label', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - GroupBy label');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('lnsDataTable');

      await retry.try(async () => {
        const layerCount = await lens.getLayerCount();
        expect(layerCount).to.be(1);
        const splitRowsText = await lens.getDimensionTriggerText('lnsDatatable_rows', 0);
        expect(splitRowsText).to.be('test');
      });
    });

    it('should convert color ranges', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - Color ranges');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('lnsDataTable');

      await retry.try(async () => {
        const closePalettePanels = await testSubjects.findAll(
          'lns-indexPattern-PalettePanelContainerBack'
        );
        if (closePalettePanels.length) {
          await lens.closePalettePanel();
          await lens.closeDimensionEditor();
        }

        await lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');

        await lens.openPalettePanel('lnsDatatable');
        const colorStops = await lens.getPaletteColorStops();

        expect(colorStops).to.eql([
          { stop: '10', color: 'rgba(84, 179, 153, 1)' },
          { stop: '100', color: 'rgba(84, 160, 0, 1)' },
          { stop: '', color: undefined },
        ]);
      });
    });

    it('should bring the ignore global filters configured at panel level over', async () => {
      const visPanel = await panelActions.getPanelHeading('Table - Ignore global filters panel');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('lnsDataTable');

      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });
  });
}
