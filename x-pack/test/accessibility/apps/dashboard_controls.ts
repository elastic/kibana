/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');

  const PageObjects = getPageObjects(['common', 'dashboard', 'home', 'dashboardControls']);
  const browser = getService('browser');

  describe('Dashboard controls a11y tests', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.home.addSampleDataSet('flights');
      await PageObjects.common.navigateToApp('dashboard');
      await testSubjects.click('dashboardListingTitleLink-[Flights]-Global-Flight-Dashboard');
      await testSubjects.click('dashboardEditMode');
    });

    after(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.home.removeSampleDataSet('flights');
    });

    it('Controls main menu panel', async () => {
      await testSubjects.click('dashboard-controls-menu-button');
      await a11y.testAppSnapshot();
    });

    it('Add controls panel', async () => {
      await testSubjects.click('controls-create-button');
      await a11y.testAppSnapshot();
    });

    it('Open data view picker', async () => {
      await testSubjects.click('open-data-view-picker');
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('Filter by type panel', async () => {
      await testSubjects.click('toggleFieldFilterButton');
      await a11y.testAppSnapshot();
      await testSubjects.click('typeFilter-string');
    });

    it('Options control panel & dashboard with options control', async () => {
      await PageObjects.dashboardControls.controlsEditorSetfield('OriginCityName');
      await a11y.testAppSnapshot();
      await testSubjects.click('control-editor-save');
      await a11y.testAppSnapshot();
    });

    it('Range control panel & dashboard with both range and options control', async () => {
      await testSubjects.click('dashboard-controls-menu-button');
      await testSubjects.click('controls-create-button');
      await testSubjects.click('field-picker-select-AvgTicketPrice');
      await a11y.testAppSnapshot();
      await testSubjects.click('control-editor-save');
      await a11y.testAppSnapshot();
    });

    it('Controls setting panel', async () => {
      await testSubjects.click('dashboard-controls-menu-button');
      await testSubjects.click('controls-settings-button');
      await testSubjects.click('control-group-validate-selections');
      await a11y.testAppSnapshot();
      await testSubjects.click('control-group-editor-save');
    });

    it('Dashboard with options and range control panel popovers', async () => {
      await testSubjects.click('dashboardQuickSaveMenuItem');
      await a11y.testAppSnapshot();
      const optionsControlId = (await PageObjects.dashboardControls.getAllControlIds())[0];
      await PageObjects.dashboardControls.optionsListOpenPopover(optionsControlId);
      await a11y.testAppSnapshot();
      // a11y error on range control https://github.com/elastic/kibana/issues/135266 - uncomment after the fix
      // const rangeControlId = (await PageObjects.dashboardControls.getAllControlIds())[1];
      // await PageObjects.dashboardControls.rangeSliderOpenPopover(rangeControlId);
      // await a11y.testAppSnapshot();
    });
  });
}
