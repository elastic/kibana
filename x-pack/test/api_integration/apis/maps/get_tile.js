/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import expect from '@kbn/expect';
import { MVT_SOURCE_LAYER_NAME } from '../../../../plugins/maps/common/constants';

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
    it('should return vector tile containing document', async () => {
      const resp = await supertest
        .get(
          `/api/maps/mvt/getTile/2/1/1.pbf\
?geometryFieldName=geo.coordinates\
&index=logstash-*\
&requestBody=(_source:!f,docvalue_fields:!(bytes,geo.coordinates,machine.os.raw),query:(bool:(filter:!((match_all:()),(range:(%27@timestamp%27:(format:strict_date_optional_time,gte:%272015-09-20T00:00:00.000Z%27,lte:%272015-09-20T01:00:00.000Z%27)))),must:!(),must_not:!(),should:!())),runtime_mappings:(),script_fields:(),size:10000,stored_fields:!(bytes,geo.coordinates,machine.os.raw))\
&geoFieldType=geo_point`
        )
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      const jsonTile = new VectorTile(new Protobuf(resp.body));
      const layer = jsonTile.layers[MVT_SOURCE_LAYER_NAME];
      expect(layer.length).to.be(3); // 2 docs + the metadata feature

      // Verify ES document

      const feature = findFeature(layer, (feature) => {
        return feature.properties._id === 'AU_x3_BsGFA8no6Qjjug';
      });
      expect(feature).not.to.be(undefined);
      expect(feature.type).to.be(1);
      expect(feature.extent).to.be(4096);
      expect(feature.id).to.be(undefined);
      expect(feature.properties).to.eql({
        __kbn__feature_id__: 'logstash-2015.09.20:AU_x3_BsGFA8no6Qjjug:0',
        _id: 'AU_x3_BsGFA8no6Qjjug',
        _index: 'logstash-2015.09.20',
        bytes: 9252,
        ['machine.os.raw']: 'ios',
      });
      expect(feature.loadGeometry()).to.eql([[{ x: 44, y: 2382 }]]);

      // Verify metadata feature
      const metadataFeature = findFeature(layer, (feature) => {
        return feature.properties.__kbn_metadata_feature__;
      });
      expect(metadataFeature).not.to.be(undefined);
      expect(metadataFeature.type).to.be(3);
      expect(metadataFeature.extent).to.be(4096);
      expect(metadataFeature.id).to.be(undefined);
      const fieldMeta = JSON.parse(metadataFeature.properties.fieldMeta);
      delete metadataFeature.properties.fieldMeta;
      expect(metadataFeature.properties).to.eql({
        __kbn_feature_count__: 2,
        __kbn_is_tile_complete__: true,
        __kbn_metadata_feature__: true,
        __kbn_vector_shape_type_counts__: '{"POINT":2,"LINE":0,"POLYGON":0}',
      });
      expect(fieldMeta.bytes.range).to.eql({
        min: 9252,
        max: 9583,
        delta: 331,
      });
      expect(fieldMeta.bytes.categories.categories.length).to.be(2);
      expect(fieldMeta['machine.os.raw'].categories.categories.length).to.be(2);
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

    it('should return vector tile containing bounds when count exceeds size', async () => {
      const resp = await supertest
        // requestBody sets size=1 to force count exceeded
        .get(
          `/api/maps/mvt/getTile/2/1/1.pbf\
?geometryFieldName=geo.coordinates\
&index=logstash-*\
&requestBody=(_source:!f,docvalue_fields:!(bytes,geo.coordinates,machine.os.raw),query:(bool:(filter:!((match_all:()),(range:(%27@timestamp%27:(format:strict_date_optional_time,gte:%272015-09-20T00:00:00.000Z%27,lte:%272015-09-20T01:00:00.000Z%27)))),must:!(),must_not:!(),should:!())),runtime_mappings:(),script_fields:(),size:1,stored_fields:!(bytes,geo.coordinates,machine.os.raw))\
&geoFieldType=geo_point`
        )
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      const jsonTile = new VectorTile(new Protobuf(resp.body));
      const layer = jsonTile.layers[MVT_SOURCE_LAYER_NAME];
      expect(layer.length).to.be(1);

      const metadataFeature = layer.feature(0);
      expect(metadataFeature.type).to.be(3);
      expect(metadataFeature.extent).to.be(4096);
      expect(metadataFeature.id).to.be(undefined);
      expect(metadataFeature.properties).to.eql({
        __kbn_metadata_feature__: true,
        __kbn_feature_count__: 0,
        __kbn_is_tile_complete__: false,
        __kbn_vector_shape_type_counts__: '{"POINT":0,"LINE":0,"POLYGON":0}',
      });
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
  });
}
