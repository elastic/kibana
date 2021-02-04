/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  const testSubjects = getService('testSubjects');
  const security = getService('security');

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

      await PageObjects.timeToVisualize.resetNewDashboard();
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

      await PageObjects.timeToVisualize.resetNewDashboard();
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

    describe('Capabilities', function capabilitiesTests() {
      describe('dashboard no-access privileges', () => {
        before(async () => {
          await PageObjects.common.navigateToApp('visualize');
          await security.testUser.setRoles(['test_logstash_reader', 'global_visualize_all'], true);
        });

        after(async () => {
          await security.testUser.restoreDefaults();
        });

        it('should not display dashboard flow prompt', async () => {
          await PageObjects.common.navigateToApp('visualize');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.visualize.gotoLandingPage();

          const hasPrompt = await testSubjects.exists('visualize-dashboard-flow-prompt');
          expect(hasPrompt).to.eql(false);
        });

        it('should not display add-to-dashboard options', async () => {
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

          await PageObjects.header.waitUntilLoadingHasFinished();
          await testSubjects.click('lnsApp_saveButton');

          const hasOptions = await testSubjects.exists('add-to-dashboard-options');
          expect(hasOptions).to.eql(false);
        });
      });

      describe('dashboard read-only privileges', () => {
        before(async () => {
          await security.testUser.setRoles(
            ['test_logstash_reader', 'global_visualize_all', 'global_dashboard_read'],
            true
          );
        });

        after(async () => {
          await security.testUser.restoreDefaults();
        });

        it('should not display dashboard flow prompt', async () => {
          await PageObjects.common.navigateToApp('visualize');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.visualize.gotoLandingPage();

          const hasPrompt = await testSubjects.exists('visualize-dashboard-flow-prompt');
          expect(hasPrompt).to.eql(false);
        });

        it('should only display "Existing" add-to-dashboard option', async () => {
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

          await PageObjects.header.waitUntilLoadingHasFinished();
          await testSubjects.click('lnsApp_saveButton');

          const hasOptions = await testSubjects.exists('add-to-dashboard-options');
          expect(hasOptions).to.eql(true);

          const hasCreateNewOption = await find.existsByCssSelector(
            'input[id="new-dashboard-option"]'
          );
          const hasExistingOption = await find.existsByCssSelector(
            'input[id="existing-dashboard-option"]'
          );
          const hasAddToLibraryOption = await find.existsByCssSelector(
            'input[id="add-to-library-option"]'
          );

          expect(hasCreateNewOption).to.eql(false);
          expect(hasExistingOption).to.eql(true);
          expect(hasAddToLibraryOption).to.eql(true);
        });
      });
    });
  });
}
