/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('maps_telemetry', () => {
    it('should return the correct telemetry values for map saved objects', async () => {
      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`/api/telemetry/v2/clusters/_stats`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          unencrypted: true,
          refreshCache: true,
        })
        .expect(200);

      const mapUsage = apiResponse.stack_stats.kibana.plugins.maps;
      delete mapUsage.timeCaptured;

      expect(mapUsage.geoShapeAggLayersCount).eql(1);
      expect(mapUsage.indexPatternsWithGeoFieldCount).eql(6);
      expect(mapUsage.indexPatternsWithGeoPointFieldCount).eql(4);
      expect(mapUsage.indexPatternsWithGeoShapeFieldCount).eql(2);
      expect(mapUsage.mapsTotalCount).eql(26);
      expect(mapUsage.basemaps).eql({});
      expect(mapUsage.joins).eql({ term: { min: 1, max: 1, total: 3, avg: 0.11538461538461539 } });
      expect(mapUsage.layerTypes).eql({
        es_docs: { min: 1, max: 2, total: 18, avg: 0.6923076923076923 },
        es_agg_grids: { min: 1, max: 1, total: 6, avg: 0.23076923076923078 },
        es_point_to_point: { min: 1, max: 1, total: 1, avg: 0.038461538461538464 },
        es_top_hits: { min: 1, max: 1, total: 2, avg: 0.07692307692307693 },
        es_agg_heatmap: { min: 1, max: 1, total: 1, avg: 0.038461538461538464 },
        kbn_tms_raster: { min: 1, max: 1, total: 1, avg: 0.038461538461538464 },
        ems_basemap: { min: 1, max: 1, total: 1, avg: 0.038461538461538464 },
        ems_region: { min: 1, max: 1, total: 1, avg: 0.038461538461538464 },
      });
      expect(mapUsage.resolutions).eql({
        coarse: { min: 1, max: 1, total: 4, avg: 0.15384615384615385 },
        super_fine: { min: 1, max: 1, total: 3, avg: 0.11538461538461539 },
      });
      expect(mapUsage.scalingOptions).eql({
        limit: { min: 1, max: 2, total: 14, avg: 0.5384615384615384 },
        clusters: { min: 1, max: 1, total: 1, avg: 0.038461538461538464 },
        mvt: { min: 1, max: 1, total: 3, avg: 0.11538461538461539 },
      });
      expect(mapUsage.attributesPerMap).eql({
        dataSourcesCount: {
          avg: 1.1538461538461537,
          max: 5,
          min: 1,
        },
        emsVectorLayersCount: {
          idThatDoesNotExitForEMSFileSource: {
            avg: 0.038461538461538464,
            max: 1,
            min: 1,
          },
        },
        layerTypesCount: {
          BLENDED_VECTOR: {
            avg: 0.038461538461538464,
            max: 1,
            min: 1,
          },
          EMS_VECTOR_TILE: {
            avg: 0.038461538461538464,
            max: 1,
            min: 1,
          },
          GEOJSON_VECTOR: {
            avg: 0.8076923076923077,
            max: 4,
            min: 1,
          },
          HEATMAP: {
            avg: 0.038461538461538464,
            max: 1,
            min: 1,
          },
          MVT_VECTOR: {
            avg: 0.23076923076923078,
            max: 1,
            min: 1,
          },
          RASTER_TILE: {
            avg: 0.038461538461538464,
            max: 1,
            min: 1,
          },
        },
        layersCount: {
          avg: 1.1923076923076923,
          max: 6,
          min: 1,
        },
      });
    });
  });
}
