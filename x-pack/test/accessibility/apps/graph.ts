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
  const browser = getService('browser');
  const find = getService('find');
  const PageObjects = getPageObjects(['settings', 'common', 'graph', 'header', 'home']);

  describe('Graph app a11y tests', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('flights');
      await PageObjects.common.navigateToApp('graph');
    });

    // after(async () => {
    //   await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
    //     useActualUrl: true,
    //   });
    //   await PageObjects.header.waitUntilLoadingHasFinished();
    //   await PageObjects.home.removeSampleDataSet('flights');
    // });

    it('Graph listing page', async function () {
      await a11y.testAppSnapshot();
    });


    it('Edit Graph page', async function () {
      await testSubjects.click('graphListingTitleLink-Kibana-Sample-Data---Flights');
      await a11y.testAppSnapshot();
    });

    it('Syntax options panel', async function () {
      await testSubjects.click('switchQueryLanguageButton');
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('Add fields panel', async function () {
      await testSubjects.click('graph-add-field-button');
      await retry.waitFor(
        'Add fields panel is visible',
        async () => await testSubjects.exists('graph-add-field-button')
      );
      await a11y.testAppSnapshot();
      await browser.pressKeys(browser.keys.ESCAPE);
    });

    it('Graph save panel', async function () {
      await testSubjects.click('graphSaveButton');
      await a11y.testAppSnapshot();
      await testSubjects.click('saveCancelButton');
    });

    it('Graph inspect panel', async function () {
      await testSubjects.click('graphInspectButton');
      await a11y.testAppSnapshot();
      await testSubjects.click('graphInspectButton');
    });



it('Graph settings - advanced settings tab', async function () {
  await testSubjects.click('graphSettingsButton');
  await a11y.testAppSnapshot();
});



    // it('Create new Graph page', async function () {
    //   await PageObjects.graph.newGraph();
    //   await a11y.testAppSnapshot();
    // });
    //
    // it('Select a data source panel', async function () {
    //   await testSubjects.click('graphDatasourceButton');
    //   await a11y.testAppSnapshot();
    //   await testSubjects.click('savedObjectTitlekibana_sample_data_flights');
    // });
    //
    // it('Add fields panel', async function () {
    //   await testSubjects.click('graph-add-field-button');
    //   await retry.waitFor(
    //     'Add fields panel is visible',
    //     async () => await testSubjects.exists('graph-add-field-button')
    //   );
    //   await a11y.testAppSnapshot();
    //   await testSubjects.setValue('graph-field-search', 'Carrier');
    // });









  });
}
