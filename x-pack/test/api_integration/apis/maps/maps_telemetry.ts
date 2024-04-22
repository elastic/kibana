/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { estypes } from '@elastic/elasticsearch';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('maps_telemetry', () => {
    it('should return the correct telemetry values for map saved objects', async () => {
      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`/internal/telemetry/clusters/_stats`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
      expect(geoPointFieldStats.count).to.be(39);
      expect(geoPointFieldStats.index_count).to.be(10);

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
        mapsTotalCount: 28,
        basemaps: {},
        joins: { term: { min: 1, max: 1, total: 4, avg: 0.14285714285714285 } },
        layerTypes: {
          es_docs: { min: 1, max: 3, total: 20, avg: 0.7142857142857143 },
          es_agg_grids: { min: 1, max: 1, total: 6, avg: 0.21428571428571427 },
          es_point_to_point: { min: 1, max: 1, total: 1, avg: 0.03571428571428571 },
          es_top_hits: { min: 1, max: 1, total: 2, avg: 0.07142857142857142 },
          es_agg_heatmap: { min: 1, max: 1, total: 1, avg: 0.03571428571428571 },
          esql: { min: 1, max: 1, total: 2, avg: 0.07142857142857142 },
          kbn_tms_raster: { min: 1, max: 1, total: 1, avg: 0.03571428571428571 },
          ems_basemap: { min: 1, max: 1, total: 1, avg: 0.03571428571428571 },
          ems_region: { min: 1, max: 1, total: 1, avg: 0.03571428571428571 },
        },
        resolutions: {
          coarse: { min: 1, max: 1, total: 4, avg: 0.14285714285714285 },
          super_fine: { min: 1, max: 1, total: 3, avg: 0.10714285714285714 },
        },
        scalingOptions: {
          limit: { min: 1, max: 3, total: 15, avg: 0.5357142857142857 },
          clusters: { min: 1, max: 1, total: 1, avg: 0.03571428571428571 },
          mvt: { min: 1, max: 1, total: 4, avg: 0.14285714285714285 },
        },
        attributesPerMap: {
          customIconsCount: {
            avg: 0,
            max: 0,
            min: 0,
          },
          dataSourcesCount: {
            avg: 1.2142857142857142,
            max: 7,
            min: 1,
          },
          emsVectorLayersCount: {
            idThatDoesNotExitForEMSFileSource: {
              avg: 0.03571428571428571,
              max: 1,
              min: 1,
            },
          },
          layerTypesCount: {
            BLENDED_VECTOR: {
              avg: 0.03571428571428571,
              max: 1,
              min: 1,
            },
            EMS_VECTOR_TILE: {
              avg: 0.03571428571428571,
              max: 1,
              min: 1,
            },
            GEOJSON_VECTOR: {
              avg: 0.8571428571428571,
              max: 6,
              min: 1,
            },
            HEATMAP: {
              avg: 0.03571428571428571,
              max: 1,
              min: 1,
            },
            MVT_VECTOR: {
              avg: 0.25,
              max: 1,
              min: 1,
            },
            RASTER_TILE: {
              avg: 0.03571428571428571,
              max: 1,
              min: 1,
            },
          },
          layersCount: {
            avg: 1.25,
            max: 8,
            min: 1,
          },
        },
      });
    });
  });
}
