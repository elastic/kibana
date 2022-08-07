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
  const retry = getService('retry');
  const inspector = getService('inspector');
  const PageObjects = getPageObjects(['common', 'settings', 'header', 'home', 'maps']);

  describe('Maps app Accessibility', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('flights');
      await PageObjects.common.navigateToApp('maps');
    });

    after(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.removeSampleDataSet('flights');
    });

    it('loads  maps workpads', async function () {
      await PageObjects.maps.loadSavedMap('[Flights] Origin Time Delayed');
      await a11y.testAppSnapshot();
    });

    it('click map settings', async function () {
      await testSubjects.click('openSettingsButton');
      await a11y.testAppSnapshot();
    });

    it('map save button', async function () {
      await testSubjects.click('mapSaveButton');
      await a11y.testAppSnapshot();
    });

    it('map cancel button', async function () {
      await testSubjects.click('saveCancelButton');
      await a11y.testAppSnapshot();
    });

    it('map inspect button', async function () {
      await testSubjects.click('openInspectorButton');
      await a11y.testAppSnapshot();
    });

    it('map inspect view chooser ', async function () {
      await testSubjects.click('inspectorViewChooser');
      await a11y.testAppSnapshot();
    });

    it('map inspector panel - view requests', async function () {
      await inspector.openInspectorRequestsView();
      await a11y.testAppSnapshot();
    });

    it('map inspector panel - view maps', async function () {
      await PageObjects.maps.openInspectorMapView();
      await a11y.testAppSnapshot();
    });

    it('map inspector close', async function () {
      await testSubjects.click('euiFlyoutCloseButton');
      await a11y.testAppSnapshot();
    });

    it('full screen button should exist', async () => {
      await testSubjects.click('mapsFullScreenMode');
      await a11y.testAppSnapshot();
    });

    it('displays exit full screen logo button', async () => {
      await testSubjects.click('exitFullScreenModeButton');
      await a11y.testAppSnapshot();
    });

    it(`allows a map to be created`, async () => {
      await PageObjects.maps.openNewMap();
      await a11y.testAppSnapshot();
      await PageObjects.maps.expectExistAddLayerButton();
      await a11y.testAppSnapshot();
      await PageObjects.maps.saveMap('my test map');
      await a11y.testAppSnapshot();
    });

    it('maps listing page', async function () {
      await PageObjects.common.navigateToApp('maps');
      await retry.waitFor(
        'maps workpads visible',
        async () => await testSubjects.exists('itemsInMemTable')
      );
      await a11y.testAppSnapshot();
    });

    it('provides bulk selection', async function () {
      await testSubjects.click('checkboxSelectAll');
      await a11y.testAppSnapshot();
    });

    it('provides bulk delete', async function () {
      await testSubjects.click('deleteSelectedItems');
      await a11y.testAppSnapshot();
      await retry.waitFor(
        'maps cancel button exists',
        async () => await testSubjects.exists('confirmModalCancelButton')
      );
    });
  });
}
