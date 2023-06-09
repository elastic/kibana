/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DebugState } from '@elastic/charts';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'visualize',
    'lens',
    'header',
    'unifiedSearch',
    'dashboard',
    'common',
  ]);
  const browser = getService('browser');
  const elasticChart = getService('elasticChart');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const monacoEditor = getService('monacoEditor');

  function assertMatchesExpectedData(state: DebugState) {
    expect(state.axes?.x![0].labels.sort()).to.eql(['css', 'gif', 'jpg', 'php', 'png']);
  }

  const defaultSettings = {
    'discover:enableSql': true,
    defaultIndex: 'log*',
  };

  async function switchToTextBasedLanguage(language: string) {
    await PageObjects.visualize.navigateToNewVisualization();
    await PageObjects.visualize.clickVisType('lens');
    await PageObjects.lens.goToTimeRange();
    await elasticChart.setNewChartUiDebugFlag(true);
    await PageObjects.lens.switchToTextBasedLanguage(language);
    await PageObjects.header.waitUntilLoadingHasFinished();
  }

  describe('lens text based language tests', () => {
    before(async () => {
      await kibanaServer.uiSettings.update(defaultSettings);
    });

    it('should navigate to text based languages mode correctly', async () => {
      await switchToTextBasedLanguage('SQL');
      expect(await testSubjects.exists('showQueryBarMenu')).to.be(false);
      expect(await testSubjects.exists('addFilter')).to.be(false);
      await testSubjects.click('TextBasedLangEditor-expand');
      const textBasedQuery = await monacoEditor.getCodeEditorValue();
      expect(textBasedQuery).to.be('SELECT * FROM "log*"');
      await testSubjects.click('TextBasedLangEditor-minimize');
    });

    it('should allow adding and using a field', async () => {
      await monacoEditor.setCodeEditorValue(
        'SELECT extension, AVG("bytes") as average FROM "logstash-*" GROUP BY extension'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.switchToVisualization('lnsMetric');
      await PageObjects.lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsMetric_primaryMetricDimensionPanel > lns-empty-dimension',
        field: 'average',
      });

      await PageObjects.lens.waitForVisualization('mtrVis');
      const metricData = await PageObjects.lens.getMetricVisualizationData();
      expect(metricData[0].title).to.eql('average');
    });

    it('should allow switching to another chart', async () => {
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.switchToVisualization('bar');
      await PageObjects.lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        field: 'extension',
      });

      await PageObjects.lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        field: 'average',
      });

      await PageObjects.lens.waitForVisualization('xyVisChart');
      const data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      assertMatchesExpectedData(data!);
    });

    it('should be possible to share a URL of a visualization with text-based language', async () => {
      const url = await PageObjects.lens.getUrl('snapshot');
      await browser.openNewTab();

      const [lensWindowHandler] = await browser.getAllWindowHandles();

      await browser.navigateTo(url);
      // check that it's the same configuration in the new URL when ready
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(
        await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel', 0, true)
      ).to.eql('extension');
      expect(
        await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0, true)
      ).to.eql('average');
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });

    it('should be possible to download a visualization with text-based language', async () => {
      await PageObjects.lens.setCSVDownloadDebugFlag(true);
      await PageObjects.lens.openCSVDownloadShare();

      const csv = await PageObjects.lens.getCSVContent();
      expect(csv).to.be.ok();
      expect(Object.keys(csv!)).to.have.length(1);
      await PageObjects.lens.setCSVDownloadDebugFlag(false);
    });

    it('should allow adding an text based languages chart to a dashboard', async () => {
      await PageObjects.lens.switchToVisualization('lnsMetric');

      await PageObjects.lens.waitForVisualization('mtrVis');
      await PageObjects.lens.removeDimension('lnsMetric_breakdownByDimensionPanel');
      await PageObjects.lens.waitForVisualization('mtrVis');
      const metricData = await PageObjects.lens.getMetricVisualizationData();
      expect(metricData[0].value).to.eql('5.7K');
      expect(metricData[0].title).to.eql('average');
      await PageObjects.lens.save('New text based languages viz', false, false, false, 'new');

      await PageObjects.dashboard.waitForRenderComplete();
      expect(metricData[0].value).to.eql('5.7K');

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);
    });

    it('should allow saving the text based languages chart into a saved object', async () => {
      await switchToTextBasedLanguage('SQL');
      await monacoEditor.setCodeEditorValue(
        'SELECT extension, AVG("bytes") as average FROM "logstash-*" GROUP BY extension'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        field: 'extension',
      });

      await PageObjects.lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        field: 'average',
      });
      await PageObjects.lens.waitForVisualization('xyVisChart');
      await PageObjects.lens.save('Lens with text based language');
      await PageObjects.lens.waitForVisualization('xyVisChart');
      const data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
      assertMatchesExpectedData(data!);
    });

    it('should allow to return to the dataview mode', async () => {
      await PageObjects.lens.switchDataPanelIndexPattern('logstash-*', true);
      expect(await testSubjects.exists('addFilter')).to.be(true);
      expect(await queryBar.getQueryString()).to.be('');
    });

    it('should allow using an index pattern that is not translated to a dataview', async () => {
      await switchToTextBasedLanguage('SQL');
      await testSubjects.click('TextBasedLangEditor-expand');
      await monacoEditor.setCodeEditorValue(
        'SELECT extension, AVG("bytes") as average FROM "logstash*" GROUP BY extension'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.switchToVisualization('lnsMetric');
      await PageObjects.lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsMetric_primaryMetricDimensionPanel > lns-empty-dimension',
        field: 'average',
      });

      await PageObjects.lens.waitForVisualization('mtrVis');
      const metricData = await PageObjects.lens.getMetricVisualizationData();
      expect(metricData[0].title).to.eql('average');
    });

    it('should be possible to share a URL of a visualization with text-based language that points to an index pattern', async () => {
      // TODO: there's some state leakage in Lens when passing from a XY chart to new Metric chart
      // which generates a wrong state (even tho it looks to work, starting fresh with such state breaks the editor)
      await PageObjects.lens.removeLayer();
      await PageObjects.lens.switchToVisualization('bar');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        field: 'extension',
      });

      await PageObjects.lens.configureTextBasedLanguagesDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        field: 'average',
      });
      const url = await PageObjects.lens.getUrl('snapshot');
      await browser.openNewTab();

      const [lensWindowHandler] = await browser.getAllWindowHandles();

      await browser.navigateTo(url);
      // check that it's the same configuration in the new URL when ready
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(
        await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel', 0, true)
      ).to.eql('extension');
      expect(
        await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel', 0, true)
      ).to.eql('average');
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });

    it('should be possible to download a visualization with text-based language that points to an index pattern', async () => {
      await PageObjects.lens.setCSVDownloadDebugFlag(true);
      await PageObjects.lens.openCSVDownloadShare();

      const csv = await PageObjects.lens.getCSVContent();
      expect(csv).to.be.ok();
      expect(Object.keys(csv!)).to.have.length(1);
      await PageObjects.lens.setCSVDownloadDebugFlag(false);
    });
  });
}
