/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['header', 'common', 'visualize', 'header', 'timePicker']);
  const find = getService('find');
  const browser = getService('browser');

  describe('indexpattern_datapanel', () => {
    it('should allow creation of lens visualizations', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');

      // Drag the @timestamp field to the workspace
      const workspace = await find.byCssSelector('[data-test-subj="lnsWorkspace"]');
      const timestampField = await find.byCssSelector(
        `[data-test-subj="lnsFieldListPanelField"] [title="@timestamp"]`
      );

      await browser.dragAndDrop(
        { location: timestampField, offset: { x: 0, y: 0 } },
        { location: workspace, offset: { x: 40, y: 40 } }
      );

      // Change the y from count to min of bytes
      await find.clickByButtonText('Count of documents');
      await find.clickByCssSelector('[data-test-subj="lns-indexPatternDimensionIncompatible-min"]');
      await find.clickByCssSelector('[data-test-subj="indexPattern-dimension-field"]');
      await find.clickByCssSelector('[data-test-subj="lns-fieldOption-bytes"]');

      // Change the title to Afancilenstest
      await find.setValue('[data-test-subj="lns_ChartTitle"]', 'Afancilenstest');

      // Save the chart
      await find.clickByCssSelector('[data-test-subj="lnsApp_saveButton"]');

      // Ensure the visualization shows up in the visualize list
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await find.clickByCssSelector('[data-test-subj="visListingTitleLink-Afancilenstest"]');

      // Expect to see the visualization editor for the saved visualization
      const title = await find
        .byCssSelector('[data-test-subj="lns_ChartTitle"]')
        .then(el => el.getAttribute('value'));
      expect(title).to.eql('Afancilenstest');

      const yDimension = await find
        .byCssSelector('[data-test-subj="lnsXY_YDimensionPanel"]')
        .then(el => el.getVisibleText());
      expect(yDimension).to.contain('Minimum of bytes');
    });
  });
}
