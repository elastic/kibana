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

  describe('Metric', function describeIndexTests() {
    const fixture =
      'x-pack/test_serverless/functional/fixtures/kbn_archiver/lens/open_in_lens/tsvb/metric.json';

    before(async () => {
      await kibanaServer.importExport.load(fixture);
    });

    after(async () => {
      await kibanaServer.importExport.unload(fixture);
    });

    beforeEach(async () => {
      await dashboard.navigateToApp(); // required for svl until dashboard PO navigation is fixed
      await dashboard.gotoDashboardEditMode('Convert to Lens - TSVB - Metric');
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should show the "Convert to Lens" menu item', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Basic');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(true);
    });

    it('should convert to Lens', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Basic');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('mtrVis');

      const metricData = await lens.getMetricVisualizationData();
      expect(metricData[0].title).to.eql('Count of records');
    });

    it('should draw static value', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Static value');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('mtrVis');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(1);
        expect(await dimensions[0].getVisibleText()).to.be('10');
      });
    });

    it('should convert metric agg with params', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Agg with params');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('mtrVis');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(1);
        expect(await dimensions[0].getVisibleText()).to.be('Count of bytes');
      });
    });

    it('should not allow converting of unsupported metric', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Unsupported metric');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting of invalid panel', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Invalid panel');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should convert color ranges', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Color ranges');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('mtrVis');

      await retry.try(async () => {
        const closePalettePanels = await testSubjects.findAll(
          'lns-indexPattern-PalettePanelContainerBack'
        );
        if (closePalettePanels.length) {
          await lens.closePalettePanel();
          await lens.closeDimensionEditor();
        }

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(1);

        await dimensions[0].click();

        await lens.openPalettePanel('lnsMetric');
        const colorStops = await lens.getPaletteColorStops();

        expect(colorStops).to.eql([
          { stop: '10', color: 'rgba(84, 179, 153, 1)' },
          { stop: '', color: undefined },
        ]);
      });
    });

    it('should bring the ignore global filters configured at series level over', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Ignore global filters series');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('mtrVis');

      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });

    it('should bring the ignore global filters configured at panel level over', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Ignore global filters panel');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('mtrVis');

      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });
  });
}
