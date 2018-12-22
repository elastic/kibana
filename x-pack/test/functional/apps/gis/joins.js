/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

const JOIN_PROPERTY_NAME = '__kbnjoin__max_of_prop1_groupby_meta_for_geo_shapes*.shape_name';
const EXPECTED_JOIN_VALUES = {
  alpha: 10,
  bravo: 3,
  charlie: 12,
};

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['gis']);

  describe('layer with joins', () => {
    before(async () => {
      await PageObjects.gis.loadSavedMap('join example');
    });

    after(async () => {
      await PageObjects.gis.closeInspector();
    });

    it('should decorate feature properties with join property', async () => {
      const mapboxStyle = await PageObjects.gis.getMapboxStyle();
      expect(mapboxStyle.sources.n1t6f.data.features.length).to.equal(3);

      mapboxStyle.sources.n1t6f.data.features.forEach(({ properties }) => {
        expect(properties.hasOwnProperty(JOIN_PROPERTY_NAME)).to.be(true);
        expect(properties[JOIN_PROPERTY_NAME]).to.be(EXPECTED_JOIN_VALUES[properties.name]);
      });
    });

    describe('inspector', () => {
      afterEach(async () => {
        await PageObjects.gis.closeInspector();
      });

      it('should contain terms aggregation elasticsearch request', async () => {
        await PageObjects.gis.openInspectorRequest('meta_for_geo_shapes*.shape_name');
        const requestStats = await PageObjects.gis.getInspectorTableData();
        const totalHits =  PageObjects.gis.getInspectorStatRowHit(requestStats, 'Hits (total)');
        expect(totalHits).to.equal('6');
        const hits =  PageObjects.gis.getInspectorStatRowHit(requestStats, 'Hits');
        expect(hits).to.equal('0'); // aggregation requests do not return any documents
        const indexPatternName =  PageObjects.gis.getInspectorStatRowHit(requestStats, 'Index pattern');
        expect(indexPatternName).to.equal('meta_for_geo_shapes*');
      });

      it('should not contain any elasticsearch request after layer is deleted', async () => {
        await PageObjects.gis.removeLayer('geo_shapes*');
        const noRequests = await PageObjects.gis.doesInspectorHaveRequests();
        expect(noRequests).to.equal(true);
      });
    });
  });
}
