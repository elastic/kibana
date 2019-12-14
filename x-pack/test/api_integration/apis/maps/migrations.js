/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService }) {
  const supertest = getService('supertest');

  describe('migrations', () => {
    it('should apply saved object reference migration when importing map saved objects prior to 7.2.0', async () => {
      const resp = await supertest
        .post(`/api/saved_objects/map`)
        .set('kbn-xsrf', 'kibana')
        .send({
          attributes: {
            title: '[Logs] Total Requests and Bytes',
            layerListJSON:
              '[{"id":"edh66","label":"Total Requests by Country","minZoom":0,"maxZoom":24,"alpha":0.5,"sourceDescriptor":{"type":"EMS_FILE","id":"world_countries"},"visible":true,"style":{"type":"VECTOR","properties":{"fillColor":{"type":"DYNAMIC","options":{"field":{"label":"count of kibana_sample_data_logs:geo.src","name":"__kbnjoin__count_groupby_kibana_sample_data_logs.geo.src","origin":"join"},"color":"Greys"}},"lineColor":{"type":"STATIC","options":{"color":"#FFFFFF"}},"lineWidth":{"type":"STATIC","options":{"size":1}},"iconSize":{"type":"STATIC","options":{"size":10}}}},"type":"VECTOR","joins":[{"leftField":"iso2","right":{"id":"673ff994-fc75-4c67-909b-69fcb0e1060e","indexPatternId":"90943e30-9a47-11e8-b64d-95841ca0b247","indexPatternTitle":"kibana_sample_data_logs","term":"geo.src"}}]},{"id":"gaxya","label":"Actual Requests","minZoom":9,"maxZoom":24,"alpha":1,"sourceDescriptor":{"id":"b7486535-171b-4d3b-bb2e-33c1a0a2854c","type":"ES_SEARCH","indexPatternId":"90943e30-9a47-11e8-b64d-95841ca0b247","geoField":"geo.coordinates","limit":2048,"filterByMapBounds":true,"tooltipProperties":["clientip","timestamp","host","request","response","machine.os","agent","bytes"]},"visible":true,"style":{"type":"VECTOR","properties":{"fillColor":{"type":"STATIC","options":{"color":"#2200ff"}},"lineColor":{"type":"STATIC","options":{"color":"#FFFFFF"}},"lineWidth":{"type":"STATIC","options":{"size":2}},"iconSize":{"type":"DYNAMIC","options":{"field":{"label":"bytes","name":"bytes","origin":"source"},"minSize":1,"maxSize":23}}}},"type":"VECTOR"},{"id":"tfi3f","label":"Total Requests and Bytes","minZoom":0,"maxZoom":9,"alpha":1,"sourceDescriptor":{"type":"ES_GEO_GRID","resolution":"COARSE","id":"8aaa65b5-a4e9-448b-9560-c98cb1c5ac5b","indexPatternId":"90943e30-9a47-11e8-b64d-95841ca0b247","geoField":"geo.coordinates","requestType":"point","metrics":[{"type":"count"},{"type":"sum","field":"bytes"}]},"visible":true,"style":{"type":"VECTOR","properties":{"fillColor":{"type":"DYNAMIC","options":{"field":{"label":"Count","name":"doc_count","origin":"source"},"color":"Blues"}},"lineColor":{"type":"STATIC","options":{"color":"#cccccc"}},"lineWidth":{"type":"STATIC","options":{"size":1}},"iconSize":{"type":"DYNAMIC","options":{"field":{"label":"sum of bytes","name":"sum_of_bytes","origin":"source"},"minSize":1,"maxSize":25}}}},"type":"VECTOR"}]',
          },
          migrationVersion: {},
        })
        .expect(200);

      expect(resp.body.references).to.eql([
        {
          id: '90943e30-9a47-11e8-b64d-95841ca0b247',
          name: 'layer_0_join_0_index_pattern',
          type: 'index-pattern',
        },
        {
          id: '90943e30-9a47-11e8-b64d-95841ca0b247',
          name: 'layer_1_source_index_pattern',
          type: 'index-pattern',
        },
        {
          id: '90943e30-9a47-11e8-b64d-95841ca0b247',
          name: 'layer_2_source_index_pattern',
          type: 'index-pattern',
        },
      ]);
      expect(resp.body.migrationVersion).to.eql({ map: '7.5.0' });
      expect(resp.body.attributes.layerListJSON.includes('indexPatternRefName')).to.be(true);
    });
  });
}
