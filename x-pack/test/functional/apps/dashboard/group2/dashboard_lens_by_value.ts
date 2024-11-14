/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { dashboard, visualize, lens, timePicker } = getPageObjects([
    'dashboard',
    'visualize',
    'lens',
    'timePicker',
  ]);

  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const kibanaServer = getService('kibanaServer');

  describe('dashboard lens by value', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
      await dashboard.clickNewDashboard();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
    });

    it('can add a lens panel by value', async () => {
      await lens.createAndAddLensFromDashboard({});
      const newPanelCount = await dashboard.getPanelCount();
      expect(newPanelCount).to.eql(1);
    });

    it('edits to a by value lens panel are properly applied', async () => {
      await dashboard.waitForRenderComplete();
      await dashboardPanelActions.clickEdit();
      await lens.switchToVisualization('pie');
      await lens.saveAndReturn();
      await dashboard.waitForRenderComplete();

      const partitionVisExists = await testSubjects.exists('partitionVisChart');
      expect(partitionVisExists).to.be(true);
    });

    it('editing and saving a lens by value panel retains number of panels', async () => {
      const originalPanelCount = await dashboard.getPanelCount();
      await dashboard.waitForRenderComplete();
      await dashboardPanelActions.clickEdit();
      await lens.switchToVisualization('treemap');
      await lens.saveAndReturn();
      await dashboard.waitForRenderComplete();
      const newPanelCount = await dashboard.getPanelCount();
      expect(newPanelCount).to.eql(originalPanelCount);
    });

    it('updates panel on dashboard when a by value panel is saved to library', async () => {
      const newTitle = 'look out library, here I come!';
      const originalPanelCount = await dashboard.getPanelCount();
      await dashboard.waitForRenderComplete();
      await dashboardPanelActions.clickEdit();
      await lens.save(newTitle, false, true);
      await dashboard.waitForRenderComplete();
      const newPanelCount = await dashboard.getPanelCount();
      expect(newPanelCount).to.eql(originalPanelCount);
      const titles = await dashboard.getPanelTitles();
      expect(titles.indexOf(newTitle)).to.not.be(-1);
    });

    it('is no longer linked to a dashboard after visiting the visualize listing page', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickLensWidget();
      await timePicker.ensureHiddenNoDataPopover();
      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      await lens.waitForVisualization('xyVisChart');
      await lens.notLinkedToOriginatingApp();

      // return to origin should not be present in save modal
      await testSubjects.click('lnsApp_saveButton');
      const redirectToOriginCheckboxExists = await testSubjects.exists('returnToOriginModeSwitch');
      expect(redirectToOriginCheckboxExists).to.be(false);
    });
  });
}
