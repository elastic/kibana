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
  const dashboardCustomizePanel = getService('dashboardCustomizePanel');
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const ecommerceSOPath = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json';
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'doc_table:legacy': false,
  };

  const from = 'Apr 27, 2019 @ 23:56:51.374';
  const to = 'Aug 23, 2019 @ 16:18:51.821';

  describe('Discover Saved Searches', () => {
    before('initialize tests', async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.importExport.load(ecommerceSOPath);
      await kibanaServer.uiSettings.update(defaultSettings);
      await PageObjects.common.setTime({ from, to });
    });

    after('clean up archives', async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.importExport.unload(ecommerceSOPath);
      await kibanaServer.uiSettings.unset('doc_table:legacy');
      await PageObjects.common.unsetTime();
    });

    describe('Customize time range', () => {
      it('should be possible to customize time range for saved searches on dashboards', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await dashboardAddPanel.clickOpenAddPanel();
        await dashboardAddPanel.addSavedSearch('Ecommerce Data');
        expect(await dataGrid.getDocCount()).to.be(500);

        await panelActions.customizePanel();
        await dashboardCustomizePanel.clickToggleShowCustomTimeRange();
        await dashboardCustomizePanel.clickToggleQuickMenuButton();
        await dashboardCustomizePanel.clickCommonlyUsedTimeRange('Last_90 days');
        await dashboardCustomizePanel.clickSaveButton();

        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await dataGrid.hasNoResults()).to.be(true);
      });
    });

    it(`should unselect saved search when navigating to a 'new'`, async function () {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('ecommerce');
      await filterBar.addFilter({ field: 'category', operation: 'is', value: `Men's Shoes` });
      await queryBar.setQuery('customer_gender:MALE');
      await queryBar.submitQuery();

      await PageObjects.discover.saveSearch('test-unselect-saved-search');

      expect(await filterBar.hasFilter('category', `Men's Shoes`)).to.be(true);
      expect(await queryBar.getQueryString()).to.eql('customer_gender:MALE');

      await PageObjects.discover.clickNewSearchButton();

      expect(await filterBar.hasFilter('category', `Men's Shoes`)).to.be(false);
      expect(await queryBar.getQueryString()).to.eql('');

      await PageObjects.discover.selectIndexPattern('logstash-*');

      expect(await filterBar.hasFilter('category', `Men's Shoes`)).to.be(false);
      expect(await queryBar.getQueryString()).to.eql('');

      await PageObjects.discover.selectIndexPattern('ecommerce');

      expect(await filterBar.hasFilter('category', `Men's Shoes`)).to.be(false);
      expect(await queryBar.getQueryString()).to.eql('');
    });
  });
}
