/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'canvas']);
  const visualTesting = getService('visualTesting');

  describe('fullscreen', () => {
    it('workpad should display properly in fullscreen mode', async () => {
      await PageObjects.common.navigateToApp('canvas', {
        hash: '/workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31/page/1'
      });

      await PageObjects.canvas.enterFullscreen();

      await PageObjects.canvas.waitForWorkpadElements();

      await visualTesting.snapshot();
    });
  });
}
