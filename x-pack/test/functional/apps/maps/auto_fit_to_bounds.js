/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['maps']);

  describe('auto fit map to bounds', () => {
    describe('without joins', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('document example');
        await PageObjects.maps.enableAutoFitToBounds();
      });

      it('should automatically fit to bounds when query is applied', async () => {
        // Set view to other side of world so no matching results
        await PageObjects.maps.setView(-15, -100, 6);

        // Setting query should trigger fit to bounds and move map
        const origView = await PageObjects.maps.getView();
        await PageObjects.maps.setAndSubmitQuery('machine.os.raw : "ios"');
        await PageObjects.maps.waitForMapPanAndZoom(origView);

        const { lat, lon, zoom } = await PageObjects.maps.getView();
        expect(Math.round(lat)).to.equal(43);
        expect(Math.round(lon)).to.equal(-102);
        expect(Math.round(zoom)).to.equal(5);
      });
    });
  });
}
