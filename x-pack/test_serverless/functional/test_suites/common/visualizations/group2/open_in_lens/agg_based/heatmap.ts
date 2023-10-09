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

  const panelActions = getService('dashboardPanelActions');
  const kibanaServer = getService('kibanaServer');

  describe('Heatmap', function describeIndexTests() {
    const fixture =
      'x-pack/test_serverless/functional/fixtures/kbn_archiver/lens/open_in_lens/agg_based/heatmap.json';

    before(async () => {
      await kibanaServer.importExport.load(fixture);
    });

    after(async () => {
      await kibanaServer.importExport.unload(fixture);
    });

    beforeEach(async () => {
      await dashboard.navigateToApp(); // required for svl until dashboard PO navigation is fixed
      await dashboard.gotoDashboardEditMode('Convert to Lens - Heatmap');
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should show the "Convert to Lens" menu item if no X-axis was specified', async () => {
      const visPanel = await panelActions.getPanelHeading('Heatmap - With Y-Axis only');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(true);
    });

    it('should show the "Convert to Lens" menu item', async () => {
      const visPanel = await panelActions.getPanelHeading('Heatmap - With X-Axis only');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(true);
    });

    it('should convert to Lens', async () => {
      const visPanel = await panelActions.getPanelHeading('Heatmap - With X-Axis only');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('heatmapChart');
      await lens.enableEchDebugState();
      const debugState = await lens.getCurrentChartDebugState('heatmapChart');

      // Must have Debug state
      expect(debugState).to.not.be.eql(null);

      // assert axes
      expect(debugState.axes!.x[0].labels).to.eql(['win 8', 'win xp', 'win 7', 'ios', 'osx']);
      expect(debugState.axes!.y[0].labels).to.eql(['']);
      expect(debugState.heatmap!.cells.length).to.eql(5);
      expect(debugState.legend!.items).to.eql([
        {
          color: '#006837',
          key: '1,322 - 1,717.5',
          name: '1,322 - 1,717.5',
        },
        { color: '#86CB66', key: '1,717.5 - 2,113', name: '1,717.5 - 2,113' },
        {
          color: '#FEFEBD',
          key: '2,113 - 2,508.5',
          name: '2,113 - 2,508.5',
        },
        {
          color: '#F88D52',
          key: '2,508.5 - 2,904',
          name: '2,508.5 - 2,904',
        },
      ]);
    });

    it('should convert to Lens if Y-axis is defined, but X-axis is not', async () => {
      const visPanel = await panelActions.getPanelHeading('Heatmap - With Y-Axis only');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('heatmapChart');
      await lens.enableEchDebugState();
      const debugState = await lens.getCurrentChartDebugState('heatmapChart');

      // Must have Debug state
      expect(debugState).to.not.be.eql(null);

      expect(debugState.axes!.x[0].labels).to.eql(['*']);
      expect(debugState.axes!.y[0].labels).to.eql(['win 8', 'win xp', 'win 7', 'ios', 'osx']);
      expect(debugState.heatmap!.cells.length).to.eql(5);
    });

    it('should respect heatmap colors number', async () => {
      const visPanel = await panelActions.getPanelHeading('Heatmap - Color number');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('heatmapChart');
      await lens.enableEchDebugState();
      const debugState = await lens.getCurrentChartDebugState('heatmapChart');

      // Must have Debug state
      expect(debugState).to.not.be.eql(null);

      expect(debugState.legend!.items).to.eql([
        {
          color: '#006837',
          key: '1,322 - 1,585.67',
          name: '1,322 - 1,585.67',
        },
        {
          color: '#4CB15D',
          key: '1,585.67 - 1,849.33',
          name: '1,585.67 - 1,849.33',
        },
        {
          color: '#B7E075',
          key: '1,849.33 - 2,113',
          name: '1,849.33 - 2,113',
        },
        {
          color: '#FEFEBD',
          key: '2,113 - 2,376.67',
          name: '2,113 - 2,376.67',
        },
        {
          color: '#FDBF6F',
          key: '2,376.67 - 2,640.33',
          name: '2,376.67 - 2,640.33',
        },
        {
          color: '#EA5839',
          key: '2,640.33 - 2,904',
          name: '2,640.33 - 2,904',
        },
      ]);
    });

    it('should show respect heatmap custom color ranges', async () => {
      const visPanel = await panelActions.getPanelHeading('Heatmap - Custom Color ranges');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('heatmapChart');
      await lens.enableEchDebugState();
      const debugState = await lens.getCurrentChartDebugState('heatmapChart');

      // Must have Debug state
      expect(debugState).to.not.be.eql(null);

      expect(debugState.legend!.items).to.eql([
        {
          color: '#006837',
          key: '0 - 100',
          name: '0 - 100',
        },
        {
          color: '#65BC62',
          key: '100 - 200',
          name: '100 - 200',
        },
        {
          color: '#D8EF8C',
          key: '200 - 300',
          name: '200 - 300',
        },
        {
          color: '#FEDF8B',
          key: '300 - 400',
          name: '300 - 400',
        },
        {
          color: '#F36D43',
          key: '400 - 500',
          name: '400 - 500',
        },
        {
          color: '#A50026',
          key: '500 - 600',
          name: '500 - 600',
        },
      ]);
    });
  });
}
