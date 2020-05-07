/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

const VECTOR_SOURCE_ID = 'z52lq';

export default function({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps', 'common']);
  const inspector = getService('inspector');
  const find = getService('find');

  describe('geo top hits', () => {
    describe('split on string field', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('document example top hits');
      });

      it('should not fetch any search hits', async () => {
        await inspector.open();
        await inspector.openInspectorRequestsView();
        const requestStats = await inspector.getTableData();
        const hits = PageObjects.maps.getInspectorStatRowHit(requestStats, 'Hits');
        expect(hits).to.equal('0'); // aggregation requests do not return any documents
      });

      it('should display top hits per entity', async () => {
        const mapboxStyle = await PageObjects.maps.getMapboxStyle();
        expect(mapboxStyle.sources[VECTOR_SOURCE_ID].data.features.length).to.equal(10);
      });

      describe('configuration', () => {
        before(async () => {
          await PageObjects.maps.openLayerPanel('logstash');
          // Can not use testSubjects because data-test-subj is placed range input and number input
          const sizeInput = await find.byCssSelector(
            `input[data-test-subj="layerPanelTopHitsSize"][type='number']`
          );
          await sizeInput.click();
          await sizeInput.clearValue();
          await sizeInput.type('3');
          await PageObjects.maps.waitForLayersToLoad();
        });

        after(async () => {
          await PageObjects.maps.closeLayerPanel();
        });

        it('should update top hits when configation changes', async () => {
          const mapboxStyle = await PageObjects.maps.getMapboxStyle();
          expect(mapboxStyle.sources[VECTOR_SOURCE_ID].data.features.length).to.equal(15);
        });
      });

      describe('query', () => {
        before(async () => {
          await PageObjects.maps.setAndSubmitQuery('machine.os.raw : "win 8"');
        });

        after(async () => {
          await PageObjects.maps.setAndSubmitQuery('');
        });

        it('should apply query to top hits request', async () => {
          await PageObjects.maps.setAndSubmitQuery('machine.os.raw : "win 8"');
          const mapboxStyle = await PageObjects.maps.getMapboxStyle();
          expect(mapboxStyle.sources[VECTOR_SOURCE_ID].data.features.length).to.equal(2);
        });
      });
    });

    describe('split on scripted field', () => {
      before(async () => {
        await PageObjects.maps.loadSavedMap('document example top hits split with scripted field');
      });

      it('should display top hits per entity', async () => {
        const mapboxStyle = await PageObjects.maps.getMapboxStyle();
        expect(mapboxStyle.sources[VECTOR_SOURCE_ID].data.features.length).to.equal(24);
      });
    });
  });
}
