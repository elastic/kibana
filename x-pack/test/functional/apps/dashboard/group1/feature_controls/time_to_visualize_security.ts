/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'timeToVisualize',
    'timePicker',
    'dashboard',
    'visEditor',
    'visualize',
    'security',
    'common',
    'header',
    'lens',
  ]);

  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardExpect = getService('dashboardExpect');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const security = getService('security');
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
      await PageObjects.security.forceLogout();

      await security.role.create('dashboard_write_vis_read', {
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

      await security.user.create('dashboard_write_vis_read_user', {
        password: 'dashboard_write_vis_read_user-password',
        roles: ['dashboard_write_vis_read'],
        full_name: 'test user',
      });

      await PageObjects.security.login(
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
      await PageObjects.security.forceLogout();

      await security.role.delete('dashboard_write_vis_read');
      await security.user.delete('dashboard_write_vis_read_user');

      await kbnServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
    });

    describe('lens by value works without library save permissions', () => {
      before(async () => {
        await PageObjects.dashboard.navigateToApp();
        await PageObjects.dashboard.preserveCrossAppState();
        await PageObjects.dashboard.clickNewDashboard();
      });

      it('can add a lens panel by value', async () => {
        await PageObjects.lens.createAndAddLensFromDashboard({});
        const newPanelCount = await PageObjects.dashboard.getPanelCount();
        expect(newPanelCount).to.eql(1);
      });

      it('edits to a by value lens panel are properly applied', async () => {
        await PageObjects.dashboard.waitForRenderComplete();
        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.clickEdit();
        await PageObjects.lens.switchToVisualization('pie');
        await PageObjects.lens.saveAndReturn();
        await PageObjects.dashboard.waitForRenderComplete();

        const partitionVisExists = await testSubjects.exists('partitionVisChart');
        expect(partitionVisExists).to.be(true);
      });

      it('disables save to library button without visualize save permissions', async () => {
        await PageObjects.dashboard.waitForRenderComplete();
        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.clickEdit();
        const saveButton = await testSubjects.find('lnsApp_saveButton');
        expect(await saveButton.getAttribute('disabled')).to.equal('true');
        await PageObjects.lens.saveAndReturn();
        await PageObjects.timeToVisualize.resetNewDashboard();
      });

      it('should allow new lens to be added by value, but not by reference', async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickVisType('lens');
        await PageObjects.lens.goToTimeRange();

        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });

        await PageObjects.lens.switchToVisualization('lnsLegacyMetric');

        await PageObjects.lens.waitForVisualization('legacyMtrVis');
        await PageObjects.lens.assertLegacyMetric('Average of bytes', '5,727.322');

        await PageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.click('lnsApp_saveButton');

        const libraryCheckbox = await find.byCssSelector('#add-to-library-checkbox');
        expect(await libraryCheckbox.getAttribute('disabled')).to.equal('true');

        await PageObjects.timeToVisualize.saveFromModal('New Lens from Modal', {
          addToDashboard: 'new',
          saveAsNew: true,
          saveToLibrary: false,
        });

        await PageObjects.dashboard.waitForRenderComplete();

        await PageObjects.lens.assertLegacyMetric('Average of bytes', '5,727.322');
        const isLinked = await PageObjects.timeToVisualize.libraryNotificationExists(
          'New Lens from Modal'
        );
        expect(isLinked).to.be(false);

        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.eql(1);

        await PageObjects.timeToVisualize.resetNewDashboard();
      });
    });

    describe('visualize by value works without library save permissions', () => {
      const originalMarkdownText = 'Original markdown text';
      const modifiedMarkdownText = 'Modified markdown text';

      before(async () => {
        await PageObjects.dashboard.navigateToApp();
        await PageObjects.dashboard.preserveCrossAppState();
        await PageObjects.dashboard.clickNewDashboard();
      });

      it('can add a markdown panel by value', async () => {
        await PageObjects.dashboard.navigateToApp();
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.waitForRenderComplete();

        await dashboardAddPanel.clickMarkdownQuickButton();
        await PageObjects.visEditor.setMarkdownTxt(originalMarkdownText);
        await PageObjects.visEditor.clickGo();

        await PageObjects.visualize.saveVisualizationAndReturn();
        const newPanelCount = await PageObjects.dashboard.getPanelCount();
        expect(newPanelCount).to.eql(1);
      });

      it('edits to a by value visualize panel are properly applied', async () => {
        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.clickEdit();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visEditor.setMarkdownTxt(modifiedMarkdownText);
        await PageObjects.visEditor.clickGo();
        await PageObjects.visualize.saveVisualizationAndReturn();

        await PageObjects.dashboard.waitForRenderComplete();
        const markdownText = await testSubjects.find('markdownBody');
        expect(await markdownText.getVisibleText()).to.eql(modifiedMarkdownText);

        const newPanelCount = PageObjects.dashboard.getPanelCount();
        expect(newPanelCount).to.eql(1);
      });

      it('disables save to library button without visualize save permissions', async () => {
        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.clickEdit();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.missingOrFail('visualizeSaveButton');
        await PageObjects.visualize.saveVisualizationAndReturn();
        await PageObjects.timeToVisualize.resetNewDashboard();
      });

      it('should allow new visualization to be added by value, but not by reference', async function () {
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
        await PageObjects.visualize.clickMetric();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.timePicker.setDefaultAbsoluteRange();

        await testSubjects.click('visualizeSaveButton');

        await PageObjects.visualize.ensureSavePanelOpen();
        const libraryCheckbox = await find.byCssSelector('#add-to-library-checkbox');
        expect(await libraryCheckbox.getAttribute('disabled')).to.equal('true');

        await PageObjects.timeToVisualize.saveFromModal('My New Vis 1', {
          addToDashboard: 'new',
        });

        await PageObjects.dashboard.waitForRenderComplete();
        await dashboardExpect.metricValuesExist(['14,005']);
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.eql(1);
      });
    });
  });
}
