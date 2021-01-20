/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'dashboard',
    'visualize',
    'lens',
    'timeToVisualize',
    'common',
    'header',
  ]);
  const find = getService('find');
  const listingTable = getService('listingTable');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('lens add-to-dashboards tests', () => {
    it('should allow new lens vizs be added to a new dashboard', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'avg',
        field: 'bytes',
      });

      await PageObjects.lens.switchToVisualization('lnsMetric');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');

      await PageObjects.lens.save('New Lens from Modal', false, false, 'new');

      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);
    });

    it('should allow existing lens vizs be added to a new dashboard', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Artistpreviouslyknownaslens');
      await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');

      await PageObjects.lens.save('Artistpreviouslyknownaslens Copy', true, false, 'new');

      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);
    });

    it('should allow new lens vizs be added to an existing dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();

      await PageObjects.dashboard.saveDashboard('My Very Cool Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Very Cool Dashboard', 1);

      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'avg',
        field: 'bytes',
      });

      await PageObjects.lens.switchToVisualization('lnsMetric');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');

      await PageObjects.lens.save(
        'New Lens from Modal',
        false,
        false,
        'existing',
        'My Very Cool Dashboard'
      );

      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });

    it('should allow existing lens vizs be added to an existing dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardAddPanel.clickOpenAddPanel();
      await dashboardAddPanel.filterEmbeddableNames('lnsXYvis');
      await find.clickByButtonText('lnsXYvis');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.lens.goToTimeRange();

      await PageObjects.dashboard.saveDashboard('My Wonderful Dashboard');
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Wonderful Dashboard', 1);

      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('Artistpreviouslyknownaslens');
      await PageObjects.lens.clickVisualizeListItemTitle('Artistpreviouslyknownaslens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');

      await PageObjects.lens.save(
        'Artistpreviouslyknownaslens Copy',
        true,
        false,
        'existing',
        'My Wonderful Dashboard'
      );

      await PageObjects.dashboard.waitForRenderComplete();

      await PageObjects.lens.assertMetric('Maximum of bytes', '19,986');

      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });
  });
}
