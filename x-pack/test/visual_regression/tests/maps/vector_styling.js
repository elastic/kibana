/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ getPageObjects, getService }) {
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

    describe('dynamic coloring', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('join and dynamic coloring demo');
        await PageObjects.maps.enterFullScreen();
        await PageObjects.maps.closeLegend();
      });

      // eslint-disable-next-line max-len
      it('should symbolize fill color with custom steps from join value and border color with dynamic color ramp from prop value', async () => {
        await visualTesting.snapshot();
      });
    });

    describe('dynamic line coloring', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('pew pew demo');
        await PageObjects.maps.enterFullScreen();
        await PageObjects.maps.closeLegend();
      });

      // eslint-disable-next-line max-len
      it('should symbolize pew pew lines', async () => {
        await visualTesting.snapshot();
      });
    });
  });
}
