/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, visualize, lens, timePicker, visEditor, visChart, dashboard } = getPageObjects([
    'common',
    'visualize',
    'lens',
    'timePicker',
    'visEditor',
    'visChart',
    'dashboard'
  ]);

  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const panelActions = getService('dashboardPanelActions');
  const kibanaServer = getService('kibanaServer');

  describe('Gauge', function describeIndexTests() {
    const fixture = 'x-pack/test_serverless/functional/fixtures/kbn_archiver/lens/open_in_lens/agg_based/gauge.json';

    before(async () => {
      await kibanaServer.importExport.load(fixture);
    })

    after(async () => {
      await kibanaServer.importExport.unload(fixture);
    })

    beforeEach(async () => {
      await common.navigateToApp('dashboards'); // required for svl until dashboard PO navigation is fixed
      await dashboard.gotoDashboardEditMode('Convert to Lens - Gauge')
      await timePicker.setDefaultAbsoluteRange()
    });

    it('should show the "Convert to Lens" menu item', async () => {
      const visPanel = await panelActions.getPanelHeading('Gauge - Basic');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(true);
    });

    it('should convert aggregation with params', async () => {
      const visPanel = await panelActions.getPanelHeading('Gauge - Agg with params');
      await panelActions.convertToLens(visPanel)
      await lens.waitForVisualization('gaugeChart');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(3);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');
      expect(await dimensions[1].getVisibleText()).to.be('Static value: 0');
      expect(await dimensions[2].getVisibleText()).to.be('Static value: 100');

      const elementWithInfo = await find.byCssSelector('.echScreenReaderOnly');
      const textContent = await elementWithInfo.getAttribute('textContent');
      expect(textContent).to.contain('Average machine.ram');
      expect(textContent).to.contain('horizontalBullet chart');
      expect(textContent).to.contain('Minimum:0');
      expect(textContent).to.contain('Maximum:100');
      expect(textContent).to.contain('Value:100');
    });

    it('should not convert aggregation with not supported field type', async () => {
      const visPanel = await panelActions.getPanelHeading('Gauge - Unsupported field type');
      expect(await panelActions.canConvertToLens(visPanel)).to.eql(false);
    });

    it('should convert color ranges', async () => {
      const visPanel = await panelActions.getPanelHeading('Gauge - Color ranges');
      await panelActions.convertToLens(visPanel)
      await lens.waitForVisualization('gaugeChart');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(3);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');
      expect(await dimensions[1].getVisibleText()).to.be('Static value: 0');
      expect(await dimensions[2].getVisibleText()).to.be('Static value: 15000000000');

      const elementWithInfo = await find.byCssSelector('.echScreenReaderOnly');
      const textContent = await elementWithInfo.getAttribute('textContent');
      expect(textContent).to.contain('Average machine.ram');
      expect(textContent).to.contain('horizontalBullet chart');
      expect(textContent).to.contain('Minimum:0');
      expect(textContent).to.contain('Maximum:15000000000');
      expect(textContent).to.contain('Value:13104036080.615');

      await dimensions[0].click();

      await lens.openPalettePanel('lnsGauge');
      const colorStops = await lens.getPaletteColorStops();

      expect(colorStops).to.eql([
        { stop: '0', color: 'rgba(0, 104, 55, 1)' },
        { stop: '10000', color: 'rgba(183, 224, 117, 1)' },
        { stop: '20000', color: 'rgba(253, 191, 111, 1)' },
        { stop: '30000', color: 'rgba(165, 0, 38, 1)' },
        { stop: '15000000000', color: undefined },
      ]);
    });
  });
}
