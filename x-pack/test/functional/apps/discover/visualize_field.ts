/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DebugState } from '@elastic/charts';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects([
    'common',
    'error',
    'discover',
    'timePicker',
    'unifiedSearch',
    'lens',
    'security',
    'spaceSelector',
    'header',
    'unifiedFieldList',
  ]);
  const elasticChart = getService('elasticChart');
  const monacoEditor = getService('monacoEditor');

  const defaultSettings = {
    'discover:enableESQL': true,
  };

  async function setDiscoverTimeRange() {
    await PageObjects.timePicker.setDefaultAbsoluteRange();
  }

  function assertMatchesExpectedData(state: DebugState) {
    expect(state.legend?.items.map(({ name }) => name).sort()).to.eql([
      'css',
      'gif',
      'jpg',
      'php',
      'png',
    ]);
  }

  describe('discover field visualize button', () => {
    before(async () => {
      await kibanaServer.uiSettings.replace(defaultSettings);
    });
    beforeEach(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await PageObjects.common.navigateToApp('discover');
      await setDiscoverTimeRange();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
    });

    it('shows "visualize" field button', async () => {
      await PageObjects.unifiedFieldList.clickFieldListItem('bytes');
      await PageObjects.unifiedFieldList.expectFieldListItemVisualize('bytes');
    });

    it('visualizes field to Lens and loads fields to the dimesion editor', async () => {
      await PageObjects.unifiedFieldList.findFieldByName('bytes');
      await PageObjects.unifiedFieldList.clickFieldListItemVisualize('bytes');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(2);
        expect(await dimensions[1].getVisibleText()).to.be('Median of bytes');
      });
    });

    it('should preserve app filters in lens', async () => {
      await filterBar.addFilter({
        field: 'bytes',
        operation: 'is between',
        value: { from: '3500', to: '4000' },
      });
      await PageObjects.unifiedFieldList.findFieldByName('geo.src');
      await PageObjects.unifiedFieldList.clickFieldListItemVisualize('geo.src');
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await filterBar.hasFilter('bytes', '3,500 to 4,000')).to.be(true);
    });

    it('should preserve query in lens', async () => {
      await queryBar.setQuery('machine.os : ios');
      await queryBar.submitQuery();
      await PageObjects.unifiedFieldList.findFieldByName('geo.dest');
      await PageObjects.unifiedFieldList.clickFieldListItemVisualize('geo.dest');
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await queryBar.getQueryString()).to.equal('machine.os : ios');
    });

    it('should visualize correctly using breakdown field', async () => {
      await PageObjects.discover.chooseBreakdownField('extension.raw');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('unifiedHistogramEditVisualization');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        const breakdownLabel = await testSubjects.find(
          'lnsDragDrop_draggable-Top 3 values of extension.raw'
        );

        const lnsWorkspace = await testSubjects.find('lnsWorkspace');
        const list = await lnsWorkspace.findAllByClassName('echLegendItem__label');
        const values = await Promise.all(
          list.map((elem: WebElementWrapper) => elem.getVisibleText())
        );

        expect(await breakdownLabel.getVisibleText()).to.eql('Top 3 values of extension.raw');
        expect(values).to.eql(['jpg', 'css', 'png', 'Other']);
      });
    });

    it('should visualize correctly using adhoc data view', async () => {
      await PageObjects.discover.createAdHocDataView('logst', true);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.click('unifiedHistogramEditVisualization');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const selectedPattern = await PageObjects.lens.getDataPanelIndexPattern();
        expect(selectedPattern).to.eql('logst*');
      });
    });

    it('should visualize correctly text based language queries in Discover', async () => {
      await PageObjects.discover.selectTextBaseLang();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await testSubjects.exists('unifiedHistogramChart')).to.be(true);
      expect(await testSubjects.exists('xyVisChart')).to.be(true);

      await PageObjects.discover.chooseLensChart('Donut');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await testSubjects.exists('partitionVisChart')).to.be(true);
    });

    it('should allow changing dimensions', async () => {
      await elasticChart.setNewChartUiDebugFlag(true);
      await PageObjects.discover.selectTextBaseLang();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.discover.chooseLensChart('Bar vertical stacked');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('TextBasedLangEditor-expand');
      await testSubjects.click('unifiedHistogramEditFlyoutVisualization');
      expect(await testSubjects.exists('xyVisChart')).to.be(true);
      expect(await PageObjects.lens.canRemoveDimension('lnsXY_xDimensionPanel')).to.equal(true);
      await PageObjects.lens.removeDimension('lnsXY_xDimensionPanel');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        field: 'extension',
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      const data = await PageObjects.lens.getCurrentChartDebugStateForVizType('xyVisChart');
      assertMatchesExpectedData(data!);
    });

    it('should visualize correctly text based language queries in Lens', async () => {
      await PageObjects.discover.selectTextBaseLang();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('TextBasedLangEditor-expand');
      await testSubjects.click('unifiedHistogramEditFlyoutVisualization');

      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.waitFor('lens flyout', async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger-textBased');
        return dimensions.length === 2 && (await dimensions[1].getVisibleText()) === 'averageB';
      });
    });

    it('should visualize correctly text based language queries based on index patterns', async () => {
      await PageObjects.discover.selectTextBaseLang();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('TextBasedLangEditor-expand');
      await testSubjects.click('unifiedHistogramEditFlyoutVisualization');

      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.waitFor('lens flyout', async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger-textBased');
        return dimensions.length === 2 && (await dimensions[1].getVisibleText()) === 'averageB';
      });
    });

    it('should save and edit chart in the dashboard on the fly', async () => {
      await PageObjects.discover.selectTextBaseLang();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats averageB = avg(bytes) by extension'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.chooseLensChart('Bar vertical stacked');
      await testSubjects.click('TextBasedLangEditor-expand');
      await testSubjects.click('unifiedHistogramSaveVisualization');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.lens.saveModal('TextBasedChart', false, false, false, 'new');
      await testSubjects.existOrFail('embeddablePanelHeading-TextBasedChart');
      await elasticChart.setNewChartUiDebugFlag(true);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('embeddablePanelToggleMenuIcon');
      await testSubjects.click('embeddablePanelAction-ACTION_CONFIGURE_IN_LENS');
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.lens.canRemoveDimension('lnsXY_xDimensionPanel')).to.equal(true);
      await PageObjects.lens.removeDimension('lnsXY_xDimensionPanel');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        field: 'extension',
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      const data = await PageObjects.lens.getCurrentChartDebugStateForVizType('xyVisChart');
      assertMatchesExpectedData(data!);
    });
  });
}
