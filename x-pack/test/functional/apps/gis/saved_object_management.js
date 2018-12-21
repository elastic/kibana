/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects }) {

  const PageObjects = getPageObjects(['gis']);

  describe('gis-map saved object management', () => {

    const MAP_NAME_PREFIX = 'saved_object_management_test_';
    const MAP1_NAME = `${MAP_NAME_PREFIX}map1`;
    const MAP2_NAME = `${MAP_NAME_PREFIX}map2`;

    describe('create', () => {
      it('should allow saving map', async () => {
        await PageObjects.gis.openNewMap();

        await PageObjects.gis.saveMap(MAP1_NAME);
        const count = await PageObjects.gis.getMapCountWithName(MAP1_NAME);
        expect(count).to.equal(1);
      });

      it('should allow saving map that crosses dateline', async () => {
        await PageObjects.gis.openNewMap();
        await PageObjects.gis.setView('64', '179', '5');

        await PageObjects.gis.saveMap(MAP2_NAME);
        const count = await PageObjects.gis.getMapCountWithName(MAP2_NAME);
        expect(count).to.equal(1);
      });
    });

    describe('delete', () => {
      it('should delete selected saved objects', async () => {
        await PageObjects.gis.deleteSavedMaps(MAP_NAME_PREFIX);

        const map1Count = await PageObjects.gis.getMapCountWithName(MAP1_NAME);
        expect(map1Count).to.equal(0);

        const map2Count = await PageObjects.gis.getMapCountWithName(MAP2_NAME);
        expect(map2Count).to.equal(0);
      });
    });

  });
}
