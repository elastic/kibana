/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps']);
  const visualTesting = getService('visualTesting');

  describe('vector styling', () => {
    describe('symbolize as icon', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('vector styling icon demo');
        await PageObjects.maps.enterFullScreen();
        await PageObjects.maps.closeLegend();
      });

      it('should symbolize points as icons with expected color, size, and orientation', async () => {
        await visualTesting.snapshot();
      });

    });
  });
}
