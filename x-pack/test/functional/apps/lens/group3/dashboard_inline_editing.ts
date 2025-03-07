/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, visualize, lens, timeToVisualize, security } = getPageObjects([
    'dashboard',
    'visualize',
    'lens',
    'timeToVisualize',
    'security',
  ]);
  const find = getService('find');
  const log = getService('log');
  const securityService = getService('security');
  const listingTable = getService('listingTable');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const elasticChart = getService('elasticChart');
  const toastsService = getService('toasts');

  const loginWithReadOnlyUser = async () => {
    await securityService.user.create('global_dashboard_read_privileges_user', {
      password: 'global_dashboard_read_privileges_user-password',
      roles: ['viewer'],
      full_name: 'test user',
    });

    await security.forceLogout();

    await security.login(
      'global_dashboard_read_privileges_user',
      'global_dashboard_read_privileges_user-password',
      {
        expectSpaceSelector: false,
      }
    );
  };

  const logoutAndDeleteReadOnlyUser = async () => {
    await security.forceLogout();
    await securityService.user.delete('global_dashboard_read_privileges_user');
  };

  const createNewLens = async () => {
    await visualize.navigateToNewVisualization();
    await visualize.clickVisType('lens');

    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'average',
      field: 'bytes',
    });

    await lens.switchToVisualization('lnsMetric');
    await lens.waitForVisualization('mtrVis');
  };

  const loadExistingLens = async () => {
    await visualize.gotoVisualizationLandingPage();
    await listingTable.searchForItemWithName('lnsXYvis');
    await lens.clickVisualizeListItemTitle('lnsXYvis');
    await lens.waitForVisualization('xyVisChart');
  };

  describe('lens inline editing tests', () => {
    it('should allow inline editing of a by value visualization', async () => {
      await createNewLens();
      await lens.save('New Lens from Modal', false, false, false, 'new');

      await dashboard.waitForRenderComplete();
      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds a secondary dimension');

      await lens.configureDimension({
        dimension: 'lnsMetric_secondaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'max',
        field: 'bytes',
      });
      await testSubjects.click('applyFlyoutButton');
      await dashboard.waitForRenderComplete();
      const data = await lens.getMetricVisualizationData();
      const expectedData = [
        {
          title: 'Average of bytes',
          subtitle: undefined,
          extraText: 'Maximum of bytes 19,986',
          value: '5,727.322',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: undefined,
          showingTrendline: false,
          showingBar: false,
        },
      ];

      log.debug(data);
      expect(data).to.eql(expectedData);

      await timeToVisualize.resetNewDashboard();
    });

    it('should allow inline editing of a by reference visualization', async () => {
      await loadExistingLens();
      await lens.save('xyVisChart Copy', true, false, false, 'new');

      await dashboard.waitForRenderComplete();
      await elasticChart.setNewChartUiDebugFlag(true);

      await dashboardPanelActions.saveToLibrary('My by reference visualization');

      await dashboardPanelActions.clickInlineEdit();

      log.debug('Removes breakdown dimension');

      await lens.removeDimension('lnsXY_splitDimensionPanel');

      await testSubjects.click('applyFlyoutButton');
      await dashboard.waitForRenderComplete();

      const data = await lens.getCurrentChartDebugStateForVizType('xyVisChart');
      expect(data?.axes?.y.length).to.eql(1);
      await timeToVisualize.resetNewDashboard();
    });

    it('should reset changes made to the previous state', async () => {
      await createNewLens();
      await lens.save('New Lens from Modal', false, false, false, 'new');

      await dashboard.waitForRenderComplete();
      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds a secondary dimension');

      await lens.configureDimension({
        dimension: 'lnsMetric_secondaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'max',
        field: 'bytes',
      });

      log.debug('Cancels the changes');
      await testSubjects.click('cancelFlyoutButton');
      await dashboard.waitForRenderComplete();

      const data = await lens.getMetricVisualizationData();
      const expectedData = [
        {
          title: 'Average of bytes',
          subtitle: undefined,
          extraText: '',
          value: '5,727.322',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: undefined,
          showingTrendline: false,
          showingBar: false,
        },
      ];

      expect(data).to.eql(expectedData);
      await timeToVisualize.resetNewDashboard();
    });

    it('should reset changes made to the previous chart with adHoc dataView created from dashboard', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();

      // it creates a XY histogram with a breakdown by ip
      await lens.createAndAddLensFromDashboard({ useAdHocDataView: true });
      await elasticChart.setNewChartUiDebugFlag(true);
      // now edit inline and remove the breakdown dimension
      await dashboardPanelActions.clickInlineEdit();
      await lens.removeDimension('lnsXY_splitDimensionPanel');

      log.debug('Cancels the changes');
      await testSubjects.click('cancelFlyoutButton');
      await dashboard.waitForRenderComplete();

      const data = await lens.getCurrentChartDebugStateForVizType('xyVisChart');
      expect(data?.bars?.length).to.be.above(1);
      // open the inline editor again and check that the breakdown is still there
      await dashboardPanelActions.clickInlineEdit();
      expect(await testSubjects.exists('lnsXY_splitDimensionPanel')).to.be(true);
      // exit via cancel again
      await testSubjects.click('cancelFlyoutButton');
    });

    it('should reset changes made to the previous chart created from dashboard', async () => {
      await dashboardPanelActions.removePanel();

      // it creates a XY histogram with a breakdown by ip
      await lens.createAndAddLensFromDashboard({});

      await dashboard.waitForRenderComplete();
      await elasticChart.setNewChartUiDebugFlag(true);
      // now edit inline and remove the breakdown dimension
      await dashboardPanelActions.clickInlineEdit();
      await lens.removeDimension('lnsXY_splitDimensionPanel');

      log.debug('Cancels the changes');
      await testSubjects.click('cancelFlyoutButton');
      await dashboard.waitForRenderComplete();

      const data = await lens.getCurrentChartDebugStateForVizType('xyVisChart');
      expect(data?.bars?.length).to.be.above(1);
      // open the inline editor again and check that the breakdown is still there
      await dashboardPanelActions.clickInlineEdit();
      expect(await testSubjects.exists('lnsXY_splitDimensionPanel')).to.be(true);
      // exit via cancel again
      await testSubjects.click('cancelFlyoutButton');
    });

    it('should apply changes made in the inline editing panel', async () => {
      // now delete the breakdown dimension and check that has been saved
      await dashboardPanelActions.clickInlineEdit();
      await lens.removeDimension('lnsXY_splitDimensionPanel');

      log.debug('Applies the changes');
      await testSubjects.click('applyFlyoutButton');
      await dashboard.waitForRenderComplete();

      const data = await lens.getCurrentChartDebugStateForVizType('xyVisChart');
      expect(data?.bars?.length).to.eql(1);
      // reset all things
      await elasticChart.setNewChartUiDebugFlag(false);
      await timeToVisualize.resetNewDashboard();
    });

    it('should allow adding an annotation', async () => {
      await loadExistingLens();
      await lens.save('xyVisChart Copy', true, false, false, 'new');

      await dashboard.waitForRenderComplete();
      await elasticChart.setNewChartUiDebugFlag(true);

      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds annotation');

      await lens.createLayer('annotations');

      expect((await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`)).length).to.eql(2);
      expect(
        await (
          await testSubjects.find('lnsXY_xAnnotationsPanel > lns-dimensionTrigger')
        ).getVisibleText()
      ).to.eql('Event');

      await testSubjects.click('applyFlyoutButton');
      await dashboard.waitForRenderComplete();
      await testSubjects.existOrFail('xyVisAnnotationIcon');
      await timeToVisualize.resetNewDashboard();
    });

    it('should allow adding a by reference annotation', async () => {
      const ANNOTATION_GROUP_TITLE = 'My by reference annotation group';
      await loadExistingLens();
      await lens.save('xyVisChart Copy 2', true, false, false, 'new');

      await dashboard.waitForRenderComplete();
      await elasticChart.setNewChartUiDebugFlag(true);

      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds by reference annotation');

      await lens.createLayer('annotations');

      await lens.performLayerAction('lnsXY_annotationLayer_saveToLibrary', 1);

      await visualize.setSaveModalValues(ANNOTATION_GROUP_TITLE, {
        description: 'my description',
      });

      await testSubjects.click('confirmSaveSavedObjectButton');

      const toastContents = await toastsService.getContentByIndex(1);

      expect(toastContents).to.be(
        `Saved "${ANNOTATION_GROUP_TITLE}"\nView or manage in the annotation library.`
      );

      // now close
      await testSubjects.click('applyFlyoutButton');

      log.debug('Edit the by reference annotation');
      // and try to edit again the by reference annotation layer event
      await dashboardPanelActions.clickInlineEdit();

      expect((await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`)).length).to.eql(2);
      expect(
        await (
          await testSubjects.find('lnsXY_xAnnotationsPanel > lns-dimensionTrigger')
        ).getVisibleText()
      ).to.eql('Event');

      await dashboard.waitForRenderComplete();

      await timeToVisualize.resetNewDashboard();
    });

    it('should allow adding a reference line', async () => {
      await loadExistingLens();
      await lens.save('xyVisChart Copy', true, false, false, 'new');

      await dashboard.waitForRenderComplete();
      await elasticChart.setNewChartUiDebugFlag(true);

      await dashboardPanelActions.clickInlineEdit();

      log.debug('Adds reference line');

      await lens.createLayer('referenceLine');

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yReferenceLineLeftPanel > lns-dimensionTrigger',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });

      await lens.selectOptionFromComboBox('lns-icon-select', 'bell');
      await lens.closeDimensionEditor();
      await testSubjects.click('applyFlyoutButton');
      await dashboard.waitForRenderComplete();

      await testSubjects.existOrFail('xyVisAnnotationIcon');

      await timeToVisualize.resetNewDashboard();
    });

    it('should not allow the show config action for a user with write permissions', async () => {
      // create a chart and save the dashboard
      await createNewLens();
      // save it and add to a new dashboard
      await lens.save('New Lens from Modal', false, false, false, 'new');
      // now save the dashboard
      await dashboard.saveDashboard('My read only testing dashboard', { saveAsNew: true });

      await dashboardPanelActions.expectMissingShowConfigPanelAction();
      // switch to view and check again
      await dashboard.switchToViewMode();
      await dashboardPanelActions.expectMissingShowConfigPanelAction();
    });

    it('should allow the show config action for a user without write permissions', async () => {
      // setup a read only user and login with it
      await loginWithReadOnlyUser();

      // open the previous dashboard
      await dashboard.navigateToApp();
      await dashboard.loadSavedDashboard('My read only testing dashboard');
      // now check the action is there
      await dashboardPanelActions.expectExistsShowConfigPanelAction();
      // clean up
      await logoutAndDeleteReadOnlyUser();
    });
  });
}
