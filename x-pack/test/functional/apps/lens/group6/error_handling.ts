/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { intersection, uniq } from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, dashboard, timePicker } = getPageObjects([
    'visualize',
    'lens',
    'dashboard',
    'timePicker',
  ]);
  const security = getService('security');
  const listingTable = getService('listingTable');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');

  describe('Lens error handling', () => {
    describe('Index Pattern missing', () => {
      before(async () => {
        await security.testUser.setRoles(
          ['global_discover_read', 'global_visualize_read', 'test_logstash_reader'],
          { skipBrowserRefresh: true }
        );
        // loading an object without reference fails, so we load data view + lens object and then unload data view
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/lens/errors'
        );
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/lens/errors2'
        );
      });

      after(async () => {
        await security.testUser.restoreDefaults();
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/lens/errors'
        );
      });

      it('the warning is shown and user can fix the state', async () => {
        await visualize.gotoVisualizationLandingPage();
        await listingTable.searchForItemWithName('lnsMetricWithNonExistingDataView');
        await lens.clickVisualizeListItemTitle('lnsMetricWithNonExistingDataView');
        await lens.waitForMissingDataViewWarning();
        await lens.switchToVisualization('lnsDatatable');
        await lens.waitForMissingDataViewWarning();
        await lens.switchToVisualization('pie');
        await lens.waitForMissingDataViewWarning();
        await lens.switchToVisualization('line');
        await lens.waitForMissingDataViewWarning();
        await lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
        await lens.closeDimensionEditor();
        await lens.dragDimensionToDimension({
          from: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
          to: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        });
        await lens.switchFirstLayerIndexPattern('log*');
        await lens.waitForMissingDataViewWarningDisappear();
        await lens.waitForEmptyWorkspace();
      });

      it('works fine when the dataViews is missing for referenceLines and annotations', async () => {
        await visualize.gotoVisualizationLandingPage();
        await listingTable.searchForItemWithName(
          'lnsXYWithReferenceLinesAndAnnotationsWithNonExistingDataView'
        );
        await lens.clickVisualizeListItemTitle(
          'lnsXYWithReferenceLinesAndAnnotationsWithNonExistingDataView'
        );
        await lens.waitForMissingDataViewWarning();
      });
    });

    it('does not block render when missing fields', async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/missing_fields'
      );

      await dashboard.navigateToApp();
      await dashboard.loadSavedDashboard('dashboard containing vis with missing fields');

      const expectedMessages = [
        'Field @timestamp was not found.',
        'Field kubernetes.node.memory.allocatable.bytes was not found.',
        'Field kubernetes.node.name was not found.',
        'Field kubernetes.container.memory.usage.bytes was not found.',
        'Sort field @timestamp was not found.',
        'Field @timestamp was not found.',
        'Field kubernetes.container.name was not found.',
      ];

      const dashboardMessageList = await lens.getMessageListTexts('error');

      // make sure all the expected messages are there
      expect(intersection(expectedMessages, dashboardMessageList).length).to.be(
        uniq(expectedMessages).length
      );
      expect(dashboardMessageList.length).to.be(expectedMessages.length);
      // make sure the visualization is rendering
      await testSubjects.find('emptyPlaceholder');

      await dashboard.switchToEditMode();
      await dashboardPanelActions.clickEdit();
      await timePicker.waitForNoDataPopover();
      await timePicker.ensureHiddenNoDataPopover();

      const editorMessageList = await lens.getMessageListTexts('error');

      expect(intersection(expectedMessages, editorMessageList).length).to.be(
        uniq(expectedMessages).length
      );
      expect(editorMessageList.length).to.be(expectedMessages.length);
      await testSubjects.find('emptyPlaceholder');

      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/missing_fields'
      );
    });

    it('displays fundamental configuration issues on dashboard', async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/fundamental_config_errors_on_dashboard'
      );

      await dashboard.navigateToApp();
      await dashboard.loadSavedDashboard('lens fundamental config errors dash');

      const failureElements = await testSubjects.findAll('errorMessageMarkdown');
      const errorMessages = await Promise.all(failureElements.map((el) => el.getVisibleText()));

      expect(errorMessages).to.eql([
        'Visualization type not found.',
        'The visualization type lnsUNKNOWN could not be resolved.',
        'Could not find datasource for the visualization',
      ]);

      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/fundamental_config_errors_on_dashboard'
      );
    });
  });
}
