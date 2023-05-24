/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import expect from '@kbn/expect';
import { getTileUrlParams } from '@kbn/maps-vector-tile-utils';

function findFeature(layer, callbackFn) {
  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);
    if (callbackFn(feature)) {
      return feature;
    }
  }
}

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('getGridTile', () => {
    const defaultParams = {
      geometryFieldName: 'geo.coordinates',
      hasLabels: false,
      index: 'logstash-*',
      gridPrecision: 8,
      requestBody: {
        aggs: {
          avg_of_bytes: {
            avg: {
              field: 'bytes',
            },
          },
        },
        query: {
          bool: {
            filter: [
              {
                match_all: {},
              },
              {
                range: {
                  '@timestamp': {
                    format: 'strict_date_optional_time',
                    gte: '2015-09-20T00:00:00.000Z',
                    lte: '2015-09-20T01:00:00.000Z',
                  },
                },
              },
            ],
            must: [],
            must_not: [],
            should: [],
          },
        },
        runtime_mappings: {
          hour_of_day: {
            script: {
              source: "// !@#$%^&*()_+ %%%\nemit(doc['timestamp'].value.getHour());",
            },
            type: 'long',
          },
        },
      },
      renderAs: 'point',
    };

    it('should return vector tile with expected headers', async () => {
      const resp = await supertest
        .get('/api/maps/mvt/getGridTile/3/2/3.pbf?' + getTileUrlParams(defaultParams))
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      expect(resp.headers['content-encoding']).to.be('gzip');
      expect(resp.headers['content-disposition']).to.be('inline');
      expect(resp.headers['content-type']).to.be('application/x-protobuf');
      expect(resp.headers['cache-control']).to.be('public, max-age=3600');
    });

    it('should return vector tile containing clusters when renderAs is "point"', async () => {
      const resp = await supertest
        .get('/api/maps/mvt/getGridTile/3/2/3.pbf?' + getTileUrlParams(defaultParams))
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      const jsonTile = new VectorTile(new Protobuf(resp.body));

      // Cluster feature
      const layer = jsonTile.layers.aggs;
      expect(layer.length).to.be(1);
      const clusterFeature = layer.feature(0);
      expect(clusterFeature.type).to.be(1);
      expect(clusterFeature.extent).to.be(4096);
      expect(clusterFeature.id).to.be(undefined);
      expect(clusterFeature.properties).to.eql({
        _count: 1,
        _key: '11/517/809',
        'avg_of_bytes.value': 9252,
      });

      // assert feature geometry is weighted centroid
      expect(clusterFeature.loadGeometry()).to.eql([[{ x: 87, y: 667 }]]);
    });

    it('should return vector tile containing clusters with renderAs is "heatmap"', async () => {
      const tileUrlParams = getTileUrlParams({
        ...defaultParams,
        renderAs: 'heatmap',
      });
      const resp = await supertest
        .get('/api/maps/mvt/getGridTile/3/2/3.pbf?' + tileUrlParams)
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      const jsonTile = new VectorTile(new Protobuf(resp.body));

      // Cluster feature
      const layer = jsonTile.layers.aggs;
      expect(layer.length).to.be(1);
      const clusterFeature = layer.feature(0);
      expect(clusterFeature.type).to.be(1);
      expect(clusterFeature.extent).to.be(4096);
      expect(clusterFeature.id).to.be(undefined);
      expect(clusterFeature.properties).to.eql({
        _count: 1,
        _key: '11/517/809',
        'avg_of_bytes.value': 9252,
      });

      // assert feature geometry is weighted centroid
      expect(clusterFeature.loadGeometry()).to.eql([[{ x: 87, y: 667 }]]);
    });

    it('should return vector tile containing grid features when renderAs is "grid"', async () => {
      const tileUrlParams = getTileUrlParams({
        ...defaultParams,
        renderAs: 'grid',
      });
      const resp = await supertest
        .get('/api/maps/mvt/getGridTile/3/2/3.pbf?' + tileUrlParams)
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      const jsonTile = new VectorTile(new Protobuf(resp.body));
      const layer = jsonTile.layers.aggs;
      expect(layer.length).to.be(1);

      const gridFeature = layer.feature(0);
      expect(gridFeature.type).to.be(3);
      expect(gridFeature.extent).to.be(4096);
      expect(gridFeature.id).to.be(undefined);
      expect(gridFeature.properties).to.eql({
        _count: 1,
        _key: '11/517/809',
        'avg_of_bytes.value': 9252,
      });

      // assert feature geometry is grid
      expect(gridFeature.loadGeometry()).to.eql([
        [
          { x: 80, y: 672 },
          { x: 80, y: 656 },
          { x: 96, y: 656 },
          { x: 96, y: 672 },
          { x: 80, y: 672 },
        ],
      ]);
    });

    it('should return vector tile containing hexegon features when renderAs is "hex"', async () => {
      const tileUrlParams = getTileUrlParams({
        ...defaultParams,
        renderAs: 'hex',
      });
      const resp = await supertest
        .get('/api/maps/mvt/getGridTile/3/2/3.pbf?' + tileUrlParams)
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      const jsonTile = new VectorTile(new Protobuf(resp.body));
      const layer = jsonTile.layers.aggs;
      expect(layer.length).to.be(1);

      const gridFeature = layer.feature(0);
      expect(gridFeature.type).to.be(3);
      expect(gridFeature.extent).to.be(4096);
      expect(gridFeature.id).to.be(undefined);
      expect(gridFeature.properties).to.eql({
        _count: 1,
        _key: '84264a3ffffffff',
        'avg_of_bytes.value': 9252,
      });

      // assert feature geometry is hex
      expect(gridFeature.loadGeometry()).to.eql([
        [
          { x: 89, y: 710 },
          { x: 67, y: 696 },
          { x: 67, y: 669 },
          { x: 89, y: 657 },
          { x: 112, y: 672 },
          { x: 111, y: 698 },
          { x: 89, y: 710 },
        ],
      ]);
    });

    it('should return vector tile containing label features when hasLabels is true', async () => {
      const tileUrlParams = getTileUrlParams({
        ...defaultParams,
        hasLabels: 'true',
        renderAs: 'hex',
      });
      const resp = await supertest
        .get('/api/maps/mvt/getGridTile/3/2/3.pbf?' + tileUrlParams)
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      const jsonTile = new VectorTile(new Protobuf(resp.body));
      const layer = jsonTile.layers.aggs;
      expect(layer.length).to.be(2);

      const labelFeature = findFeature(layer, (feature) => {
        return feature.properties._mvt_label_position === true;
      });
      expect(labelFeature).not.to.be(undefined);
      expect(labelFeature.type).to.be(1);
      expect(labelFeature.extent).to.be(4096);
      expect(labelFeature.id).to.be(undefined);
      expect(labelFeature.properties).to.eql({
        _count: 1,
        _key: '84264a3ffffffff',
        'avg_of_bytes.value': 9252,
        _mvt_label_position: true,
      });
      expect(labelFeature.loadGeometry()).to.eql([[{ x: 89, y: 684 }]]);
    });

    it('should return vector tile with meta layer', async () => {
      const resp = await supertest
        .get('/api/maps/mvt/getGridTile/3/2/3.pbf?' + getTileUrlParams(defaultParams))
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      const jsonTile = new VectorTile(new Protobuf(resp.body));

      // Metadata feature
      const metaDataLayer = jsonTile.layers.meta;
      expect(metaDataLayer.length).to.be(1);
      const metadataFeature = metaDataLayer.feature(0);
      expect(metadataFeature.type).to.be(3);
      expect(metadataFeature.extent).to.be(4096);

      expect(metadataFeature.properties['aggregations._count.avg']).to.eql(1);
      expect(metadataFeature.properties['aggregations._count.count']).to.eql(1);
      expect(metadataFeature.properties['aggregations._count.min']).to.eql(1);
      expect(metadataFeature.properties['aggregations._count.sum']).to.eql(1);

      expect(metadataFeature.properties['aggregations.avg_of_bytes.avg']).to.eql(9252);
      expect(metadataFeature.properties['aggregations.avg_of_bytes.count']).to.eql(1);
      expect(metadataFeature.properties['aggregations.avg_of_bytes.max']).to.eql(9252);
      expect(metadataFeature.properties['aggregations.avg_of_bytes.min']).to.eql(9252);
      expect(metadataFeature.properties['aggregations.avg_of_bytes.sum']).to.eql(9252);

      expect(metadataFeature.properties['hits.total.relation']).to.eql('eq');
      expect(metadataFeature.properties['hits.total.value']).to.eql(1);

      expect(metadataFeature.loadGeometry()).to.eql([
        [
          { x: 0, y: 4096 },
          { x: 0, y: 0 },
          { x: 4096, y: 0 },
          { x: 4096, y: 4096 },
          { x: 0, y: 4096 },
        ],
      ]);
    });

    it('should return error when index does not exist', async () => {
      const tileUrlParams = getTileUrlParams({
        ...defaultParams,
        index: 'notRealIndex',
      });
      await supertest
        .get('/api/maps/mvt/getGridTile/3/2/3.pbf?' + tileUrlParams)
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(404);
    });
  });
}
