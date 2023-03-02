/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { estypes } from '@elastic/elasticsearch';
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

      const geoPointFieldStats = apiResponse.cluster_stats.indices.mappings.field_types.find(
        (fieldStat: estypes.ClusterStatsFieldTypes) => {
          return fieldStat.name === 'geo_point';
        }
      );
      expect(geoPointFieldStats.count).to.be(7);
      expect(geoPointFieldStats.index_count).to.be(6);

      const geoShapeFieldStats = apiResponse.cluster_stats.indices.mappings.field_types.find(
        (fieldStat: estypes.ClusterStatsFieldTypes) => {
          return fieldStat.name === 'geo_shape';
        }
      );
      expect(geoShapeFieldStats.count).to.be(3);
      expect(geoShapeFieldStats.index_count).to.be(3);

      const mapUsage = apiResponse.stack_stats.kibana.plugins.maps;
      delete mapUsage.timeCaptured;

      expect(mapUsage).eql({
        mapsTotalCount: 27,
        basemaps: {},
        joins: { term: { min: 1, max: 1, total: 3, avg: 0.1111111111111111 } },
        layerTypes: {
          es_docs: { min: 1, max: 2, total: 19, avg: 0.7037037037037037 },
          es_agg_grids: { min: 1, max: 1, total: 6, avg: 0.2222222222222222 },
          es_point_to_point: { min: 1, max: 1, total: 1, avg: 0.037037037037037035 },
          es_top_hits: { min: 1, max: 1, total: 2, avg: 0.07407407407407407 },
          es_agg_heatmap: { min: 1, max: 1, total: 1, avg: 0.037037037037037035 },
          kbn_tms_raster: { min: 1, max: 1, total: 1, avg: 0.037037037037037035 },
          ems_basemap: { min: 1, max: 1, total: 1, avg: 0.037037037037037035 },
          ems_region: { min: 1, max: 1, total: 1, avg: 0.037037037037037035 },
        },
        resolutions: {
          coarse: { min: 1, max: 1, total: 4, avg: 0.14814814814814814 },
          super_fine: { min: 1, max: 1, total: 3, avg: 0.1111111111111111 },
        },
        scalingOptions: {
          limit: { min: 1, max: 2, total: 14, avg: 0.5185185185185185 },
          clusters: { min: 1, max: 1, total: 1, avg: 0.037037037037037035 },
          mvt: { min: 1, max: 1, total: 4, avg: 0.14814814814814814 },
        },
        attributesPerMap: {
          customIconsCount: {
            avg: 0,
            max: 0,
            min: 0,
          },
          dataSourcesCount: {
            avg: 1.1481481481481481,
            max: 5,
            min: 1,
          },
          emsVectorLayersCount: {
            idThatDoesNotExitForEMSFileSource: {
              avg: 0.037037037037037035,
              max: 1,
              min: 1,
            },
          },
          layerTypesCount: {
            BLENDED_VECTOR: {
              avg: 0.037037037037037035,
              max: 1,
              min: 1,
            },
            EMS_VECTOR_TILE: {
              avg: 0.037037037037037035,
              max: 1,
              min: 1,
            },
            GEOJSON_VECTOR: {
              avg: 0.7777777777777778,
              max: 4,
              min: 1,
            },
            HEATMAP: {
              avg: 0.037037037037037035,
              max: 1,
              min: 1,
            },
            MVT_VECTOR: {
              avg: 0.25925925925925924,
              max: 1,
              min: 1,
            },
            RASTER_TILE: {
              avg: 0.037037037037037035,
              max: 1,
              min: 1,
            },
          },
          layersCount: {
            avg: 1.1851851851851851,
            max: 6,
            min: 1,
          },
        },
      });
    });
  });
}
