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
  const panelActions = getService('dashboardPanelActions');
  const kibanaServer = getService('kibanaServer');

  describe('Metric', function describeIndexTests() {
    const fixture =
      'x-pack/test_serverless/functional/fixtures/kbn_archiver/lens/open_in_lens/agg_based/metric.json';

    before(async () => {
      await kibanaServer.importExport.load(fixture);
    });

    after(async () => {
      await kibanaServer.importExport.unload(fixture);
    });

    beforeEach(async () => {
      await dashboard.navigateToApp(); // required for svl until dashboard PO navigation is fixed
      await dashboard.gotoDashboardEditMode('Convert to Lens - Metric');
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should convert to Lens', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Basic');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('mtrVis');

      const data = await lens.getMetricVisualizationData();
      expect(data.length).to.be.equal(1);
      expect(data).to.eql([
        {
          title: 'Count',
          subtitle: undefined,
          extraText: '',
          value: '14,005',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
          showingTrendline: false,
        },
      ]);
    });

    it('should convert aggregation with params', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Agg with params');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('mtrVis');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(1);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');

      const data = await lens.getMetricVisualizationData();
      expect(data.length).to.be.equal(1);
      expect(data).to.eql([
        {
          title: 'Average machine.ram',
          subtitle: undefined,
          extraText: '',
          value: '13,104,036,080.615',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
          showingTrendline: false,
        },
      ]);
    });

    it('should convert sibling pipeline aggregation', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Sibling pipeline agg');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('mtrVis');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(2);
      expect(await dimensions[0].getVisibleText()).to.be('Overall Max of Count');
      expect(await dimensions[1].getVisibleText()).to.be('@timestamp');

      const data = await lens.getMetricVisualizationData();
      expect(data.length).to.be.equal(1);
      expect(data).to.eql([
        {
          title: 'Overall Max of Count',
          subtitle: undefined,
          extraText: '',
          value: '1,437',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
          showingTrendline: false,
        },
      ]);
    });

    it('should not convert aggregation with not supported field type', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Unsupported field type');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should convert color ranges', async () => {
      const visPanel = await panelActions.getPanelHeading('Metric - Color ranges');
      await panelActions.convertToLens(visPanel);
      await lens.waitForVisualization('mtrVis');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(2);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');
      expect(await dimensions[1].getVisibleText()).to.be('machine.os.raw: Descending');
      const data = await lens.getMetricVisualizationData();
      expect(data.length).to.be.equal(6);
      expect(data).to.eql([
        {
          title: 'osx',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '13,228,964,670.613',
          color: 'rgba(165, 0, 38, 1)',
          showingBar: false,
          showingTrendline: false,
        },
        {
          title: 'win 7',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '13,186,695,551.251',
          color: 'rgba(253, 191, 111, 1)',
          showingBar: false,
          showingTrendline: false,
        },
        {
          title: 'win xp',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '13,073,190,186.423',
          color: 'rgba(183, 224, 117, 1)',
          showingBar: false,
          showingTrendline: false,
        },
        {
          title: 'win 8',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '13,031,579,645.108',
          color: 'rgba(183, 224, 117, 1)',
          showingBar: false,
          showingTrendline: false,
        },
        {
          title: 'ios',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '13,009,497,206.823',
          color: 'rgba(183, 224, 117, 1)',
          showingBar: false,
          showingTrendline: false,
        },
        {
          title: undefined,
          subtitle: undefined,
          extraText: undefined,
          value: undefined,
          color: 'rgba(0, 0, 0, 0)',
          showingBar: false,
          showingTrendline: false,
        },
      ]);

      await dimensions[0].click();

      await lens.openPalettePanel('lnsMetric');
      const colorStops = await lens.getPaletteColorStops();

      expect(colorStops).to.eql([
        {
          color: 'rgba(0, 104, 55, 1)',
          stop: '12000000000',
        },
        {
          color: 'rgba(183, 224, 117, 1)',
          stop: '13000000000',
        },
        {
          color: 'rgba(253, 191, 111, 1)',
          stop: '13100000000',
        },
        {
          color: 'rgba(165, 0, 38, 1)',
          stop: '13200000000',
        },
        {
          color: undefined,
          stop: '13300000000',
        },
      ]);
    });
  });
}
