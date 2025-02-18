/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { timeToVisualize, timePicker, dashboard, visEditor, visualize, security, header, lens } =
    getPageObjects([
      'timeToVisualize',
      'timePicker',
      'dashboard',
      'visEditor',
      'visualize',
      'security',
      'header',
      'lens',
    ]);

  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardExpect = getService('dashboardExpect');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const securityService = getService('security');
  const find = getService('find');
  const kbnServer = getService('kibanaServer');

  describe('dashboard time to visualize security', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kbnServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/dashboard/feature_controls/security/security.json'
      );

      await kbnServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });

      // ensure we're logged out so we can login as the appropriate users
      await security.forceLogout();

      await securityService.role.create('dashboard_write_vis_read', {
        elasticsearch: {
          indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
        },
        kibana: [
          {
            feature: {
              dashboard: ['all'],
              visualize: ['read'],
            },
            spaces: ['*'],
          },
        ],
      });

      await securityService.user.create('dashboard_write_vis_read_user', {
        password: 'dashboard_write_vis_read_user-password',
        roles: ['dashboard_write_vis_read'],
        full_name: 'test user',
      });

      await security.login(
        'dashboard_write_vis_read_user',
        'dashboard_write_vis_read_user-password',
        {
          expectSpaceSelector: false,
        }
      );
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await security.forceLogout();

      await securityService.role.delete('dashboard_write_vis_read');
      await securityService.user.delete('dashboard_write_vis_read_user');

      await kbnServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
    });

    describe('lens by value works without library save permissions', () => {
      before(async () => {
        await dashboard.navigateToApp();
        await dashboard.preserveCrossAppState();
        await dashboard.clickNewDashboard();
      });

      it('can add a lens panel by value', async () => {
        await lens.createAndAddLensFromDashboard({});
        const newPanelCount = await dashboard.getPanelCount();
        expect(newPanelCount).to.eql(1);
      });

      it('edits to a by value lens panel are properly applied', async () => {
        await dashboard.waitForRenderComplete();
        await dashboardPanelActions.navigateToEditorFromFlyout();
        await lens.switchToVisualization('pie');
        await lens.saveAndReturn();
        await dashboard.waitForRenderComplete();

        const partitionVisExists = await testSubjects.exists('partitionVisChart');
        expect(partitionVisExists).to.be(true);
      });

      it('disables save to library button without visualize save permissions', async () => {
        await dashboard.waitForRenderComplete();
        await dashboardPanelActions.navigateToEditorFromFlyout();
        const saveButton = await testSubjects.find('lnsApp_saveButton');
        expect(await saveButton.getAttribute('disabled')).to.equal('true');
        await lens.saveAndReturn();
        await timeToVisualize.resetNewDashboard();
      });

      it('should allow new lens to be added by value, but not by reference', async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await lens.goToTimeRange();

        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });

        await lens.switchToVisualization('lnsLegacyMetric');

        await lens.waitForVisualization('legacyMtrVis');
        await lens.assertLegacyMetric('Average of bytes', '5,727.322');

        await header.waitUntilLoadingHasFinished();
        await testSubjects.click('lnsApp_saveButton');

        const libraryCheckbox = await find.byCssSelector('#add-to-library-checkbox');
        expect(await libraryCheckbox.getAttribute('disabled')).to.equal('true');

        await timeToVisualize.saveFromModal('New Lens from Modal', {
          addToDashboard: 'new',
          saveAsNew: true,
          saveToLibrary: false,
        });

        await dashboard.waitForRenderComplete();

        await lens.assertLegacyMetric('Average of bytes', '5,727.322');

        const panelCount = await dashboard.getPanelCount();
        expect(panelCount).to.eql(1);

        await timeToVisualize.resetNewDashboard();
      });
    });

    describe('visualize by value works without library save permissions', () => {
      const originalMarkdownText = 'Original markdown text';
      const modifiedMarkdownText = 'Modified markdown text';

      before(async () => {
        await dashboard.navigateToApp();
        await dashboard.preserveCrossAppState();
        await dashboard.clickNewDashboard();
      });

      it('can add a markdown panel by value', async () => {
        await dashboard.navigateToApp();
        await dashboard.clickNewDashboard();
        await dashboard.waitForRenderComplete();

        await dashboardAddPanel.clickAddMarkdownPanel();
        await visEditor.setMarkdownTxt(originalMarkdownText);
        await visEditor.clickGo();

        await visualize.saveVisualizationAndReturn();
        const newPanelCount = await dashboard.getPanelCount();
        expect(newPanelCount).to.eql(1);
      });

      it('edits to a by value visualize panel are properly applied', async () => {
        await dashboardPanelActions.clickEdit();
        await header.waitUntilLoadingHasFinished();
        await visEditor.setMarkdownTxt(modifiedMarkdownText);
        await visEditor.clickGo();
        await visualize.saveVisualizationAndReturn();

        await dashboard.waitForRenderComplete();
        const markdownText = await testSubjects.find('markdownBody');
        expect(await markdownText.getVisibleText()).to.eql(modifiedMarkdownText);

        const newPanelCount = dashboard.getPanelCount();
        expect(newPanelCount).to.eql(1);
      });

      it('disables save to library button without visualize save permissions', async () => {
        await dashboardPanelActions.clickEdit();
        await header.waitUntilLoadingHasFinished();
        await testSubjects.missingOrFail('visualizeSaveButton');
        await visualize.saveVisualizationAndReturn();
        await timeToVisualize.resetNewDashboard();
      });

      it('should allow new visualization to be added by value, but not by reference', async function () {
        await visualize.navigateToNewAggBasedVisualization();
        await visualize.clickMetric();
        await visualize.clickNewSearch();
        await timePicker.setDefaultAbsoluteRange();

        await testSubjects.click('visualizeSaveButton');

        await visualize.ensureSavePanelOpen();
        const libraryCheckbox = await find.byCssSelector('#add-to-library-checkbox');
        expect(await libraryCheckbox.getAttribute('disabled')).to.equal('true');

        await timeToVisualize.saveFromModal('My New Vis 1', {
          addToDashboard: 'new',
        });

        await dashboard.waitForRenderComplete();
        await dashboardExpect.metricValuesExist(['14,005']);
        const panelCount = await dashboard.getPanelCount();
        expect(panelCount).to.eql(1);
      });
    });
  });
}
