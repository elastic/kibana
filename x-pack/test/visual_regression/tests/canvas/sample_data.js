/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'header', 'home', 'canvas']);
  const visualTesting = getService('visualTesting');

  describe('sample data', () => {
    describe('ecommerce', () => {
      before(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.addSampleDataSet('ecommerce');
      });

      describe('page 1', () => {
        before(async () => {
          await PageObjects.common.navigateToApp('canvas', {
            hash: '/workpad/workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e/page/1'
          });

          PageObjects.canvas.enterFullscreen();

          PageObjects.canvas.waitForWorkpadElements();
        });

        after(async () => {
          PageObjects.canvas.exitFullscreen();
        });

        it('workpad and all elements should load and display properly', async () => {
          await visualTesting.snapshot();
        });
      });

      describe('page 2', () => {
        before(async () => {
          await PageObjects.common.navigateToApp('canvas', {
            hash: '/workpad/workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e/page/2'
          });

          PageObjects.canvas.enterFullscreen();

          PageObjects.canvas.waitForWorkpadElements();
        });

        after(async () => {
          PageObjects.canvas.exitFullscreen();
        });

        it('workpad and all elements should load and display properly', async () => {
          await visualTesting.snapshot();
        });
      });
    });

    describe('logs', () => {
      before(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.home.addSampleDataSet('logs');

        await PageObjects.common.navigateToApp('canvas', {
          hash: '/workpad/workpad-ad72a4e9-b422-480c-be6d-a64a0b79541d/page/1'
        });

        PageObjects.canvas.enterFullscreen();

        PageObjects.canvas.waitForWorkpadElements();
      });

      after(async () => {
        PageObjects.canvas.exitFullscreen();
      });

      it('workpad and all elements should load and display properly', async () => {
        await visualTesting.snapshot();
      });
    });
  });
}
