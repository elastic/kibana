/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardBadgeActions = getService('dashboardBadgeActions');
  const dashboardCustomizePanel = getService('dashboardCustomizePanel');
  const { dashboard, lens } = getPageObjects(['dashboard', 'lens']);

  const DASHBOARD_NAME = 'Custom panel time range test';

  describe('custom time range', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
      await dashboard.clickNewDashboard();
      await dashboard.saveDashboard(DASHBOARD_NAME);
    });

    describe('by value', () => {
      it('can add a custom time range to a panel', async () => {
        await lens.createAndAddLensFromDashboard({});
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.enableCustomTimeRange();
        await dashboardCustomizePanel.openDatePickerQuickMenu();
        await dashboardCustomizePanel.clickCommonlyUsedTimeRange('Last_30 days');
        await dashboardCustomizePanel.clickSaveButton();
        await dashboard.waitForRenderComplete();
        await dashboardBadgeActions.expectExistsTimeRangeBadgeAction();
        expect(await testSubjects.exists('emptyPlaceholder')).to.be(true);
        await dashboard.clickQuickSave();
      });

      it('can remove a custom time range from a panel', async () => {
        await dashboardBadgeActions.clickTimeRangeBadgeAction();
        await dashboardCustomizePanel.disableCustomTimeRange();
        await dashboardCustomizePanel.clickSaveButton();
        await dashboard.waitForRenderComplete();
        await dashboardBadgeActions.expectMissingTimeRangeBadgeAction();
        expect(await testSubjects.exists('xyVisChart')).to.be(true);
      });
    });

    describe('by reference', () => {
      it('can add a custom time range to panel', async () => {
        await dashboardPanelActions.legacySaveToLibrary('My by reference visualization');
        await dashboardPanelActions.customizePanel();
        await dashboardCustomizePanel.enableCustomTimeRange();
        await dashboardCustomizePanel.openDatePickerQuickMenu();
        await dashboardCustomizePanel.clickCommonlyUsedTimeRange('Last_30 days');
        await dashboardCustomizePanel.clickSaveButton();
        await dashboard.waitForRenderComplete();
        await dashboardBadgeActions.expectExistsTimeRangeBadgeAction();
        expect(await testSubjects.exists('emptyPlaceholder')).to.be(true);
        await dashboard.clickQuickSave();
      });

      it('can remove a custom time range from a panel', async () => {
        await dashboardBadgeActions.clickTimeRangeBadgeAction();
        await dashboardCustomizePanel.disableCustomTimeRange();
        await dashboardCustomizePanel.clickSaveButton();
        await dashboard.waitForRenderComplete();
        await dashboardBadgeActions.expectMissingTimeRangeBadgeAction();
        expect(await testSubjects.exists('xyVisChart')).to.be(true);
      });
    });
  });
}
