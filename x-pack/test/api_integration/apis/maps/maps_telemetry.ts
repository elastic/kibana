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

      expect(mapUsage).eql({
        geoShapeAggLayersCount: 1,
        indexPatternsWithGeoFieldCount: 6,
        indexPatternsWithGeoPointFieldCount: 4,
        indexPatternsWithGeoShapeFieldCount: 2,
        mapsTotalCount: 25,
        basemaps: {},
        joins: { term: { min: 1, max: 1, total: 3, avg: 0.12 } },
        layerTypes: {
          es_docs: { min: 1, max: 2, total: 17, avg: 0.68 },
          es_agg_grids: { min: 1, max: 1, total: 6, avg: 0.24 },
          es_point_to_point: { min: 1, max: 1, total: 1, avg: 0.04 },
          es_top_hits: { min: 1, max: 1, total: 2, avg: 0.08 },
          es_agg_heatmap: { min: 1, max: 1, total: 1, avg: 0.04 },
          kbn_tms_raster: { min: 1, max: 1, total: 1, avg: 0.04 },
          ems_basemap: { min: 1, max: 1, total: 1, avg: 0.04 },
          ems_region: { min: 1, max: 1, total: 1, avg: 0.04 },
        },
        resolutions: {
          coarse: { min: 1, max: 1, total: 4, avg: 0.16 },
          super_fine: { min: 1, max: 1, total: 3, avg: 0.12 },
        },
        scalingOptions: {
          limit: { min: 1, max: 2, total: 14, avg: 0.56 },
          clusters: { min: 1, max: 1, total: 1, avg: 0.04 },
          mvt: { min: 1, max: 1, total: 2, avg: 0.08 },
        },
        attributesPerMap: {
          customIconsCount: {
            avg: 0,
            max: 0,
            min: 0,
          },
          dataSourcesCount: {
            avg: 1.16,
            max: 5,
            min: 1,
          },
          emsVectorLayersCount: {
            idThatDoesNotExitForEMSFileSource: {
              avg: 0.04,
              max: 1,
              min: 1,
            },
          },
          layerTypesCount: {
            BLENDED_VECTOR: {
              avg: 0.04,
              max: 1,
              min: 1,
            },
            EMS_VECTOR_TILE: {
              avg: 0.04,
              max: 1,
              min: 1,
            },
            GEOJSON_VECTOR: {
              avg: 0.84,
              max: 4,
              min: 1,
            },
            HEATMAP: {
              avg: 0.04,
              max: 1,
              min: 1,
            },
            MVT_VECTOR: {
              avg: 0.2,
              max: 1,
              min: 1,
            },
            RASTER_TILE: {
              avg: 0.04,
              max: 1,
              min: 1,
            },
          },
          layersCount: {
            avg: 1.2,
            max: 6,
            min: 1,
          },
        },
      });
    });
  });
}
