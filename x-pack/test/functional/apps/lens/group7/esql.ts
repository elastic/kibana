/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, header, common, timePicker } = getPageObjects([
    'dashboard',
    'header',
    'common',
    'timePicker',
  ]);
  const monacoEditor = getService('monacoEditor');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('lens ES|QL tests', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.replace(defaultSettings);
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    after(async () => {
      await timePicker.resetDefaultAbsoluteRangeViaUiSettings();
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
    });
    it('should add a limit without changing the chart type or the color', async () => {
      await dashboard.navigateToApp();
      // no dataviews page
      await testSubjects.click('tryESQLLink');
      await dashboard.switchToEditMode();
      // edit the existing panel that is being added when the Try ES|QL CTA is clicked
      const [panel] = await dashboard.getDashboardPanels();
      await dashboardPanelActions.clickInlineEdit(panel);
      await dashboard.waitForRenderComplete();

      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats maxB = max(bytes) by geo.dest'
      );
      await testSubjects.click('ESQLEditor-run-query-button');
      await header.waitUntilLoadingHasFinished();

      // change to line chart
      await testSubjects.click('lnsChartSwitchPopover');
      await testSubjects.click('lnsChartSwitchPopover_line');
      await header.waitUntilLoadingHasFinished();

      // change the color to red
      await testSubjects.click('lnsXY_yDimensionPanel');
      const colorPickerInput = await testSubjects.find('~indexPattern-dimension-colorPicker');
      await colorPickerInput.clearValueWithKeyboard();
      await colorPickerInput.type('#ff0000');
      await common.sleep(1000); // give time for debounced components to rerender

      await header.waitUntilLoadingHasFinished();
      await testSubjects.click('lns-indexPattern-dimensionContainerClose');
      await testSubjects.click('applyFlyoutButton');
      expect(await testSubjects.exists('xyVisChart')).to.be(true);

      await dashboardPanelActions.clickInlineEdit(panel);

      await header.waitUntilLoadingHasFinished();
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | stats maxB = max(bytes) by geo.dest | limit 10'
      );
      await testSubjects.click('ESQLEditor-run-query-button');
      await header.waitUntilLoadingHasFinished();

      // check that the type is still line
      const chartSwitcher = await testSubjects.find('lnsChartSwitchPopover');
      const type = await chartSwitcher.getVisibleText();
      expect(type).to.be('Line');

      // check that the color is still red
      await testSubjects.click('lnsXY_yDimensionPanel');
      const colorPickerInputAfterFilter = await testSubjects.find(
        '~indexPattern-dimension-colorPicker'
      );
      expect(await colorPickerInputAfterFilter.getAttribute('value')).to.be('#FF0000');
    });
  });
}
