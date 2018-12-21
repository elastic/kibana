/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['gis']);
  const DOC_COUNT_PROP_NAME = 'doc_count';

  describe('layer geohashgrid aggregation source', () => {

    describe('heatmap', () => {
      before(async () => {
        await PageObjects.gis.loadSavedMap('geohashgrid heatmap example');
      });

      after(async () => {
        await PageObjects.gis.closeInspector();
      });

      const LAYER_ID = '3xlvm';
      const EXPECTED_NUMBER_FEATURES = 6;
      const HEATMAP_PROP_NAME = '__kbn_heatmap_weight__';

      it('should decorate feature properties with scaled doc_count property', async () => {
        const mapboxStyle = await PageObjects.gis.getMapboxStyle();
        expect(mapboxStyle.sources[LAYER_ID].data.features.length).to.equal(EXPECTED_NUMBER_FEATURES);

        mapboxStyle.sources[LAYER_ID].data.features.forEach(({ properties }) => {
          expect(properties.hasOwnProperty(HEATMAP_PROP_NAME)).to.be(true);
          expect(properties.hasOwnProperty(DOC_COUNT_PROP_NAME)).to.be(true);
        });
      });

      describe('inspector', () => {
        afterEach(async () => {
          await PageObjects.gis.closeInspector();
        });

        it('should contain geohashgrid aggregation elasticsearch request', async () => {
          await PageObjects.gis.openInspectorRequestsView();
          const requestStats = await PageObjects.gis.getInspectorTableData();
          const totalHits =  PageObjects.gis.getInspectorStatRowHit(requestStats, 'Hits (total)');
          expect(totalHits).to.equal('6');
          const hits =  PageObjects.gis.getInspectorStatRowHit(requestStats, 'Hits');
          expect(hits).to.equal('0'); // aggregation requests do not return any documents
          const indexPatternName =  PageObjects.gis.getInspectorStatRowHit(requestStats, 'Index pattern');
          expect(indexPatternName).to.equal('logstash-*');
        });

        it('should not contain any elasticsearch request after layer is deleted', async () => {
          await PageObjects.gis.removeLayer('logstash-*');
          const noRequests = await PageObjects.gis.doesInspectorHaveRequests();
          expect(noRequests).to.equal(true);
        });
      });
    });

    describe('vector(grid)', () => {
      before(async () => {
        await PageObjects.gis.loadSavedMap('geohashgrid vector grid example');
      });

      after(async () => {
        await PageObjects.gis.closeInspector();
      });

      const LAYER_ID = 'g1xkv';
      const EXPECTED_NUMBER_FEATURES = 6;
      const MAX_OF_BYTES_PROP_NAME = 'max_of_bytes';

      it('should decorate feature properties with metrics properterties', async () => {
        const mapboxStyle = await PageObjects.gis.getMapboxStyle();
        expect(mapboxStyle.sources[LAYER_ID].data.features.length).to.equal(EXPECTED_NUMBER_FEATURES);

        mapboxStyle.sources[LAYER_ID].data.features.forEach(({ properties }) => {
          expect(properties.hasOwnProperty(MAX_OF_BYTES_PROP_NAME)).to.be(true);
          expect(properties.hasOwnProperty(DOC_COUNT_PROP_NAME)).to.be(true);
        });
      });

      describe('inspector', () => {
        afterEach(async () => {
          await PageObjects.gis.closeInspector();
        });

        it('should contain geohashgrid aggregation elasticsearch request', async () => {
          await PageObjects.gis.openInspectorRequestsView();
          const requestStats = await PageObjects.gis.getInspectorTableData();
          const totalHits =  PageObjects.gis.getInspectorStatRowHit(requestStats, 'Hits (total)');
          expect(totalHits).to.equal('6');
          const hits =  PageObjects.gis.getInspectorStatRowHit(requestStats, 'Hits');
          expect(hits).to.equal('0'); // aggregation requests do not return any documents
          const indexPatternName =  PageObjects.gis.getInspectorStatRowHit(requestStats, 'Index pattern');
          expect(indexPatternName).to.equal('logstash-*');
        });

        it('should not contain any elasticsearch request after layer is deleted', async () => {
          await PageObjects.gis.removeLayer('logstash-*');
          const noRequests = await PageObjects.gis.doesInspectorHaveRequests();
          expect(noRequests).to.equal(true);
        });
      });
    });

  });
}
