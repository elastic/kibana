/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import expect from '@kbn/expect';
import { MVT_SOURCE_LAYER_NAME } from '../../../../plugins/maps/common/constants';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('getTile', () => {
    it('should return vector tile containing document', async () => {
      const resp = await supertest
        .get(
          `/api/maps/mvt/getTile\
?x=1\
&y=1\
&z=2\
&geometryFieldName=geo.coordinates\
&index=logstash-*\
&requestBody=(_source:!f,docvalue_fields:!(bytes,geo.coordinates,machine.os.raw),query:(bool:(filter:!((match_all:()),(range:(%27@timestamp%27:(format:strict_date_optional_time,gte:%272015-09-20T00:00:00.000Z%27,lte:%272015-09-20T01:00:00.000Z%27)))),must:!(),must_not:!(),should:!())),runtime_mappings:(),script_fields:(),size:10000,stored_fields:!(bytes,geo.coordinates,machine.os.raw))\
&geoFieldType=geo_point`
        )
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      const jsonTile = new VectorTile(new Protobuf(resp.body));
      const layer = jsonTile.layers[MVT_SOURCE_LAYER_NAME];
      expect(layer.length).to.be(2);
      const feature = layer.feature(0);
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
    });

    it('should return vector tile containing bounds when count exceeds size', async () => {
      const resp = await supertest
        // requestBody sets size=1 to force count exceeded
        .get(
          `/api/maps/mvt/getTile\
?x=1\
&y=1\
&z=2\
&geometryFieldName=geo.coordinates\
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
      const feature = layer.feature(0);
      expect(feature.type).to.be(3);
      expect(feature.extent).to.be(4096);
      expect(feature.id).to.be(undefined);
      expect(feature.properties).to.eql({ __kbn_too_many_features__: true });
      expect(feature.loadGeometry()).to.eql([
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
