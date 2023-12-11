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
  const find = getService('find');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const panelActions = getService('dashboardPanelActions');
  const kibanaServer = getService('kibanaServer');

  describe('Time Series', function describeIndexTests() {
    const fixture =
      'x-pack/test_serverless/functional/fixtures/kbn_archiver/lens/open_in_lens/tsvb/timeseries.json';

    before(async () => {
      await kibanaServer.importExport.load(fixture);
    });

    after(async () => {
      await kibanaServer.importExport.unload(fixture);
    });

    beforeEach(async () => {
      await dashboard.navigateToApp(); // required for svl until dashboard PO navigation is fixed
      await dashboard.gotoDashboardEditMode('Convert to Lens - TSVB - Timeseries');
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should show the "Convert to Lens" menu item for a count aggregation', async () => {
      const visPanel = await panelActions.getPanelHeading('Timeseries - Basic');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(true);
    });

    it('visualizes field to Lens and loads fields to the dimesion editor', async () => {
      const visPanel = await panelActions.getPanelHeading('Timeseries - Basic');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(2);
        expect(await dimensions[0].getVisibleText()).to.be('@timestamp');
        expect(await dimensions[1].getVisibleText()).to.be('Count of records');
      });
    });

    it('should preserve app filters in lens', async () => {
      const visPanel = await panelActions.getPanelHeading('Timeseries - With filter');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      expect(await filterBar.hasFilter('extension', 'css')).to.be(true);
    });

    it('should preserve query in lens', async () => {
      const visPanel = await panelActions.getPanelHeading('Timeseries - With query');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      expect(await queryBar.getQueryString()).to.equal('machine.os : ios');
    });

    it('should draw a reference line', async () => {
      const visPanel = await panelActions.getPanelHeading('Timeseries - Reference line');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        const layers = await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`);

        const referenceLineDimensions = await testSubjects.findAllDescendant(
          'lns-dimensionTrigger',
          layers[1]
        );
        expect(referenceLineDimensions).to.have.length(1);
        expect(await referenceLineDimensions[0].getVisibleText()).to.be('Static value: 10');

        const dimensions = await testSubjects.findAllDescendant('lns-dimensionTrigger', layers[0]);
        expect(dimensions).to.have.length(2);
        expect(await dimensions[0].getVisibleText()).to.be('@timestamp');
        expect(await dimensions[1].getVisibleText()).to.be('Count of records');
      });
    });

    it('should convert metric agg with params', async () => {
      const visPanel = await panelActions.getPanelHeading('Timeseries - Agg with params');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(2);
        expect(await dimensions[0].getVisibleText()).to.be('@timestamp');
        expect(await dimensions[1].getVisibleText()).to.eql(
          'Counter rate of machine.ram per second'
        );
      });
    });

    it('should not allow converting of invalid panel', async () => {
      const visPanel = await panelActions.getPanelHeading('Timeseries - Invalid panel');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should not allow converting of unsupported aggregations', async () => {
      const visPanel = await panelActions.getPanelHeading('Timeseries - Unsupported aggregations');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should convert parent pipeline aggregation with terms', async () => {
      const visPanel = await panelActions.getPanelHeading('Timeseries - Parent pipeline agg');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(3);
        expect(await dimensions[0].getVisibleText()).to.be('@timestamp');
        expect(await dimensions[1].getVisibleText()).to.eql('Cumulative sum of Records');
        expect(await dimensions[2].getVisibleText()).to.eql('Top 10 values of extension.raw');
      });
    });

    it('should convert sibling pipeline aggregation with terms', async () => {
      const visPanel = await panelActions.getPanelHeading('Timeseries - Sibling pipeline agg');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(3);
        expect(await dimensions[0].getVisibleText()).to.be('@timestamp');
        expect(await dimensions[1].getVisibleText()).to.eql('overall_average(count())');
        expect(await dimensions[2].getVisibleText()).to.eql('Top 10 values of extension.raw');
      });
    });

    it('should bring the ignore global filters configured at series level over', async () => {
      const visPanel = await panelActions.getPanelHeading(
        'Timeseries - Ignore global filters series'
      );
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });

    it('should bring the ignore global filters configured at panel level over', async () => {
      const visPanel = await panelActions.getPanelHeading(
        'Timeseries - Ignore global filters panel'
      );
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('xyVisChart');

      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });
  });
}
