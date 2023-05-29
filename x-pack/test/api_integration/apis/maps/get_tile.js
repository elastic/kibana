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

  describe('getTile', () => {
    const defaultParams = {
      geometryFieldName: 'geo.coordinates',
      hasLabels: false,
      index: 'logstash-*',
      requestBody: {
        fields: [
          'bytes',
          'machine.os.raw',
          {
            field: '@timestamp',
            format: 'epoch_millis',
          },
        ],
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
        size: 10000,
      },
    };

    it('should return ES vector tile containing documents and metadata', async () => {
      const resp = await supertest
        .get(`/api/maps/mvt/getTile/2/1/1.pbf?${getTileUrlParams(defaultParams)}`)
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      expect(resp.headers['content-encoding']).to.be('gzip');
      expect(resp.headers['content-disposition']).to.be('inline');
      expect(resp.headers['content-type']).to.be('application/x-protobuf');
      expect(resp.headers['cache-control']).to.be('public, max-age=3600');

      const jsonTile = new VectorTile(new Protobuf(resp.body));
      const layer = jsonTile.layers.hits;
      expect(layer.length).to.be(2); // 2 docs

      // Verify ES document

      const feature = findFeature(layer, (feature) => {
        return feature.properties._id === 'AU_x3_BsGFA8no6Qjjug';
      });
      expect(feature).not.to.be(undefined);
      expect(feature.type).to.be(1);
      expect(feature.extent).to.be(4096);
      expect(feature.id).to.be(undefined);
      expect(feature.properties).to.eql({
        '@timestamp': '1442709961071',
        _id: 'AU_x3_BsGFA8no6Qjjug',
        _index: 'logstash-2015.09.20',
        bytes: 9252,
        'machine.os.raw': 'ios',
      });
      expect(feature.loadGeometry()).to.eql([[{ x: 44, y: 2382 }]]);

      // Verify metadata feature
      const metaDataLayer = jsonTile.layers.meta;
      const metadataFeature = metaDataLayer.feature(0);
      expect(metadataFeature).not.to.be(undefined);
      expect(metadataFeature.type).to.be(3);
      expect(metadataFeature.extent).to.be(4096);
      expect(metadataFeature.id).to.be(undefined);

      // This is dropping some irrelevant properties from the comparison
      expect(metadataFeature.properties['hits.total.relation']).to.eql('eq');
      expect(metadataFeature.properties['hits.total.value']).to.eql(2);
      expect(metadataFeature.properties.timed_out).to.eql(false);

      expect(metadataFeature.loadGeometry()).to.eql([
        [
          { x: 44, y: 2382 },
          { x: 44, y: 1913 },
          { x: 550, y: 1913 },
          { x: 550, y: 2382 },
          { x: 44, y: 2382 },
        ],
      ]);
    });

    it('should return ES vector tile containing label features when hasLabels is true', async () => {
      const tileUrlParams = getTileUrlParams({
        ...defaultParams,
        hasLabels: true,
      });
      const resp = await supertest
        .get(`/api/maps/mvt/getTile/2/1/1.pbf?${tileUrlParams}`)
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      expect(resp.headers['content-encoding']).to.be('gzip');
      expect(resp.headers['content-disposition']).to.be('inline');
      expect(resp.headers['content-type']).to.be('application/x-protobuf');
      expect(resp.headers['cache-control']).to.be('public, max-age=3600');

      const jsonTile = new VectorTile(new Protobuf(resp.body));
      const layer = jsonTile.layers.hits;
      expect(layer.length).to.be(4); // 2 docs + 2 label features

      // Verify ES document

      const feature = findFeature(layer, (feature) => {
        return (
          feature.properties._id === 'AU_x3_BsGFA8no6Qjjug' &&
          feature.properties._mvt_label_position === true
        );
      });
      expect(feature).not.to.be(undefined);
      expect(feature.type).to.be(1);
      expect(feature.extent).to.be(4096);
      expect(feature.id).to.be(undefined);
      expect(feature.properties).to.eql({
        '@timestamp': '1442709961071',
        _id: 'AU_x3_BsGFA8no6Qjjug',
        _index: 'logstash-2015.09.20',
        bytes: 9252,
        'machine.os.raw': 'ios',
        _mvt_label_position: true,
      });
      expect(feature.loadGeometry()).to.eql([[{ x: 44, y: 2382 }]]);
    });

    it('should return error when index does not exist', async () => {
      const tileUrlParams = getTileUrlParams({
        ...defaultParams,
        index: 'notRealIndex',
      });
      await supertest
        .get(`/api/maps/mvt/getTile/2/1/1.pbf?${tileUrlParams}`)
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(404);
    });
  });
}
