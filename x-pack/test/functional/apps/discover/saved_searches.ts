/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'header', 'discover', 'timePicker', 'dashboard']);
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dataGrid = getService('dataGrid');
  const panelActions = getService('dashboardPanelActions');
  const panelActionsTimeRange = getService('dashboardPanelTimeRange');

  describe('Discover Saved Searches', () => {
    before('initialize tests', async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce_kibana');
      await kibanaServer.uiSettings.update({ 'doc_table:legacy': false });
    });
    after('clean up archives', async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce_kibana');
      await kibanaServer.uiSettings.unset('doc_table:legacy');
    });

    describe('Customize time range', () => {
      it('should be possible to customize time range for saved searches on dashboards', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        const fromTime = 'Apr 27, 2019 @ 23:56:51.374';
        const toTime = 'Aug 23, 2019 @ 16:18:51.821';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await dashboardAddPanel.clickOpenAddPanel();
        await dashboardAddPanel.addSavedSearch('Ecommerce Data');
        expect(await dataGrid.getDocCount()).to.be(500);
        await panelActions.openContextMenuMorePanel();
        await panelActionsTimeRange.clickTimeRangeActionInContextMenu();
        await panelActionsTimeRange.clickToggleQuickMenuButton();
        await panelActionsTimeRange.clickCommonlyUsedTimeRange('Last_90 days');
        await panelActionsTimeRange.clickModalPrimaryButton();
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await dataGrid.hasNoResults()).to.be(true);
      });
    });
  });
}
