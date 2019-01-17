/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects, getService, updateBaselines }) {
  const PageObjects = getPageObjects(['common', 'gis', 'header', 'home']);
  const screenshot = getService('screenshots');

  describe('gis-maps loaded from sample data', () => {

    // Sample data is shifted to be relative to current time
    // This means that a static timerange will return different documents
    // Setting the time range to a window larger than the sample data set
    // ensures all documents are coverered by time query so the ES results will always be the same
    async function setTimerangeToCoverAllSampleData() {
      const past = new Date();
      past.setMonth(past.getMonth() - 6);
      const future = new Date();
      future.setMonth(future.getMonth() + 6);
      await PageObjects.header.setAbsoluteRange(
        PageObjects.header.formatDateToAbsoluteTimeString(past),
        PageObjects.header.formatDateToAbsoluteTimeString(future)
      );
    }

    describe('ecommerce', () => {
      before(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.addSampleDataSet('ecommerce');
        await PageObjects.gis.loadSavedMap('[eCommerce] Orders by Country');
        await PageObjects.gis.toggleLayerVisibility('road_map');
        await setTimerangeToCoverAllSampleData();
      });

      after(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.removeSampleDataSet('ecommerce');
      });

      it('should load saved object and display layers', async () => {
        const percentDifference = await screenshot.compareAgainstBaseline('ecommerce_map', updateBaselines);
        expect(percentDifference).to.be.lessThan(0.05);
      });
    });

    describe('flights', () => {
      before(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.addSampleDataSet('flights');
        await PageObjects.gis.loadSavedMap('[Flights] Origin and Destination Flight Time');
        await PageObjects.gis.toggleLayerVisibility('road_map');
        await setTimerangeToCoverAllSampleData();
      });

      after(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.removeSampleDataSet('flights');
      });

      it('should load saved object and display layers', async () => {
        const percentDifference = await screenshot.compareAgainstBaseline('flights_map', updateBaselines);
        expect(percentDifference).to.be.lessThan(0.05);
      });
    });


    describe('web logs', () => {
      before(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.addSampleDataSet('logs');
        await PageObjects.gis.loadSavedMap('[Logs] Total Requests and Bytes');
        await PageObjects.gis.toggleLayerVisibility('road_map');
        await setTimerangeToCoverAllSampleData();
      });

      after(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.removeSampleDataSet('logs');
      });

      it('should load saved object and display layers', async () => {
        const percentDifference = await screenshot.compareAgainstBaseline('web_logs_map', updateBaselines);
        expect(percentDifference).to.be.lessThan(0.05);
      });
    });

  });
}
