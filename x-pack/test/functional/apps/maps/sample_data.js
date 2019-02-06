/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'maps', 'header', 'home']);

  describe('maps loaded from sample data', () => {
    describe('web logs', () => {

      before(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.addSampleDataSet('logs');
        await PageObjects.maps.loadSavedMap('[Logs] Web Traffic');
      });

      after(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.removeSampleDataSet('logs');
      });

      it('should contain web log heatmap layer', async () => {
        const exists = await PageObjects.maps.doesLayerExist('logs(heatmap)');
        expect(exists).to.be(true);
      });

      it('should contain web log document layer', async () => {
        const exists = await PageObjects.maps.doesLayerExist('logs(documents)');
        expect(exists).to.be(true);
      });
    });
  });
}
