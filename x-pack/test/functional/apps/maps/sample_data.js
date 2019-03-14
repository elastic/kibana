/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'maps', 'header', 'home', 'timePicker']);
  const applitools = getService('applitools');

  describe('maps loaded from sample data', () => {

    // Sample data is shifted to be relative to current time
    // This means that a static timerange will return different documents
    // Setting the time range to a window larger than the sample data set
    // ensures all documents are coverered by time query so the ES results will always be the same
    async function setTimerangeToCoverAllSampleData() {
      const past = new Date();
      past.setMonth(past.getMonth() - 6);
      const future = new Date();
      future.setMonth(future.getMonth() + 6);
      await PageObjects.maps.setAbsoluteRange(
        PageObjects.timePicker.formatDateToAbsoluteTimeString(past),
        PageObjects.timePicker.formatDateToAbsoluteTimeString(future)
      );
    }

    // Skipped because EMS vectors are not accessible in CI
    describe('ecommerce', () => {
      before(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.addSampleDataSet('ecommerce');
        await PageObjects.maps.loadSavedMap('[eCommerce] Orders by Country');
        await PageObjects.maps.toggleLayerVisibility('road_map');
        await PageObjects.maps.toggleLayerVisibility('United Kingdom');
        await PageObjects.maps.toggleLayerVisibility('France');
        await PageObjects.maps.toggleLayerVisibility('United States');
        await PageObjects.maps.toggleLayerVisibility('World Countries');
        await setTimerangeToCoverAllSampleData();
        await PageObjects.maps.enterFullScreen();
      });

      after(async () => {
        await PageObjects.maps.existFullScreen();
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.removeSampleDataSet('ecommerce');
      });

      it('should load layers', async () => {
        await applitools.snapshotWindow();
      });
    });

    describe('flights', () => {
      before(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.addSampleDataSet('flights');
        await PageObjects.maps.loadSavedMap('[Flights] Origin and Destination Flight Time');
        await PageObjects.maps.toggleLayerVisibility('road_map');
        await setTimerangeToCoverAllSampleData();
        await PageObjects.maps.enterFullScreen();
      });

      after(async () => {
        await PageObjects.maps.existFullScreen();
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.removeSampleDataSet('flights');
      });

      it('should load saved object and display layers', async () => {
        await applitools.snapshotWindow();
      });
    });

    // Skipped because EMS vectors are not accessible in CI
    describe('web logs', () => {
      before(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.addSampleDataSet('logs');
        await PageObjects.maps.loadSavedMap('[Logs] Total Requests and Bytes');
        await PageObjects.maps.toggleLayerVisibility('road_map');
        await PageObjects.maps.toggleLayerVisibility('Total Requests by Country');
        await setTimerangeToCoverAllSampleData();
        await PageObjects.maps.enterFullScreen();
      });

      after(async () => {
        await PageObjects.maps.existFullScreen();
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.removeSampleDataSet('logs');
      });

      it('should load saved object and display layers', async () => {
        await applitools.snapshotWindow();
      });
    });

  });
}
