/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { svlCommonPage, lens, timePicker, dashboard } = getPageObjects([
    'svlCommonPage',
    'lens',
    'timePicker',
    'dashboard',
  ]);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const panelActions = getService('dashboardPanelActions');
  const kibanaServer = getService('kibanaServer');

  describe('XY', function describeIndexTests() {
    const fixture =
      'x-pack/test_serverless/functional/fixtures/kbn_archiver/lens/open_in_lens/agg_based/xy.json';

    before(async () => {
      await kibanaServer.importExport.load(fixture);
      await svlCommonPage.loginWithPrivilegedRole();
    });

    after(async () => {
      await kibanaServer.importExport.unload(fixture);
    });

    beforeEach(async () => {
      await dashboard.navigateToApp(); // required for svl until dashboard PO navigation is fixed
      await dashboard.gotoDashboardEditMode('Convert to Lens - XY');
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should not allow converting if dot size aggregation is defined', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Dot size metric');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting if split chart is defined', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Split chart');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting if more than one axis left/right/top/bottom are defined', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Multiple Y Axes');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting if several split series are defined', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Multiple Split Series');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting if sibling pipeline agg and split series are defined', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Sibling pipeline agg w/ split');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting of unsupported aggregation', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Unsupported Agg');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should convert in different layers if metrics have different chart types', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Differing Layers');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(2);
        const layerChartSwitches = await testSubjects.findAll('lnsChartSwitchPopover');
        expect(layerChartSwitches.length).to.be(2);
        expect(await layerChartSwitches[0].getVisibleText()).to.be('Area');
        expect(await layerChartSwitches[1].getVisibleText()).to.be('Bar vertical');
        const yDimensionText1 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        const yDimensionText2 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 1);
        expect(yDimensionText1).to.be('Count');
        expect(yDimensionText2).to.be('Max memory');
      });
    });

    it('should convert in one layer if metrics have the same chart type', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Similar Layers');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
        const layerChartSwitches = await testSubjects.findAll('lnsChartSwitchPopover');
        expect(layerChartSwitches.length).to.be(1);
        expect(await layerChartSwitches[0].getVisibleText()).to.be('Bar vertical');
        const yDimensionText1 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        const yDimensionText2 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 1);
        expect(yDimensionText1).to.be('Count');
        expect(yDimensionText2).to.be('Max memory');
      });
    });

    it('should convert parent pipeline aggregation', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Parent pipeline agg');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        const splitText = await lens.getDimensionTriggerText('lnsXY_splitDimensionPanel', 0);
        expect(yDimensionText).to.be('Cumulative Sum of Count');
        expect(splitText).to.be('@timestamp');
      });
    });

    it('should convert sibling pipeline aggregation', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Sibling pipeline agg');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      expect(await lens.getLayerCount()).to.be(1);

      const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
      const splitText = await lens.getDimensionTriggerText('lnsXY_splitDimensionPanel', 0);

      expect(yDimensionText).to.be('Overall Max of Count');
      expect(splitText).to.be('@timestamp');

      await lens.openDimensionEditor('lnsXY_splitDimensionPanel > lns-dimensionTrigger');
      const collapseBy = await testSubjects.find('indexPattern-collapse-by');
      expect(await collapseBy.getAttribute('value')).to.be('max');
    });

    it('should draw a reference line', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Reference line');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(2);
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(yDimensionText).to.be('Count');
        const referenceLineDimensionText = await lens.getDimensionTriggerText(
          'lnsXY_yReferenceLineLeftPanel',
          0
        );

        expect(referenceLineDimensionText).to.be('Static value: 10');
      });
    });

    it('should convert line stacked to area stacked chart', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Stacked lines');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
        const layerChartSwitches = await testSubjects.findAll('lnsChartSwitchPopover');
        expect(layerChartSwitches.length).to.be(1);
        expect(await layerChartSwitches[0].getVisibleText()).to.be('Area stacked');
      });
    });

    it('should convert percentage charts', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Percentage chart');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
        const layerChartSwitches = await testSubjects.findAll('lnsChartSwitchPopover');
        expect(layerChartSwitches.length).to.be(1);
        expect(await layerChartSwitches[0].getVisibleText()).to.be('Area percentage');
      });
    });

    it('should convert horizontal bar', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Horizontal Bar');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
        const layerChartSwitches = await testSubjects.findAll('lnsChartSwitchPopover');
        expect(layerChartSwitches.length).to.be(1);
        expect(await layerChartSwitches[0].getVisibleText()).to.be('Bar horizontal');
      });
    });

    it('should convert y-axis positions', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Axis positions');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      expect(await lens.getLayerCount()).to.be(1);

      const yDimensionText1 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
      const yDimensionText2 = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 1);
      expect(yDimensionText1).to.be('Count');
      expect(yDimensionText2).to.be('Max memory');

      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      let axisPosition = await lens.getSelectedAxisSide();
      expect(axisPosition).to.be('Left');
      await lens.closeDimensionEditor();

      await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger', 0, 1);
      axisPosition = await lens.getSelectedAxisSide();
      expect(axisPosition).to.be('Right');
    });

    it('should convert split series', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - Split Series');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      const expectedData = ['win 8', 'win xp', 'win 7', 'ios', 'osx'];
      await lens.enableEchDebugState();
      const data = await lens.getCurrentChartDebugState('xyVisChart');
      await retry.try(async () => {
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(yDimensionText).to.be('Count');
        const splitDimensionText = await lens.getDimensionTriggerText(
          'lnsXY_splitDimensionPanel',
          0
        );
        expect(splitDimensionText).to.be('machine.os.raw: Descending');
      });
      expect(data?.legend?.items.map((item) => item.name)).to.eql(expectedData);
    });

    it('should convert x-axis', async () => {
      const visPanel = await panelActions.getPanelHeading('XY - X Axis');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      const expectedData = ['Count'];
      await lens.enableEchDebugState();
      const data = await lens.getCurrentChartDebugState('xyVisChart');
      await retry.try(async () => {
        const yDimensionText = await lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0);
        expect(yDimensionText).to.be('Count');
        const xDimensionText = await lens.getDimensionTriggerText('lnsXY_xDimensionPanel', 0);
        expect(xDimensionText).to.be('machine.os.raw: Descending');
      });
      expect(data?.legend?.items.map((item) => item.name)).to.eql(expectedData);
    });
  });
}
