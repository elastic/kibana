/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import expect from '@kbn/expect';
import {
  KBN_IS_CENTROID_FEATURE,
  MVT_SOURCE_LAYER_NAME,
} from '../../../../plugins/maps/common/constants';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('getGridTile', () => {
    it('should return vector tile containing cluster features', async () => {
      const resp = await supertest
        .get(
          `/api/maps/mvt/getGridTile\
?x=2\
&y=3\
&z=3\
&geometryFieldName=geo.coordinates\
&index=logstash-*\
&requestBody=(_source:(excludes:!()),aggs:(gridSplit:(aggs:(avg_of_bytes:(avg:(field:bytes)),gridCentroid:(geo_centroid:(field:geo.coordinates))),geotile_grid:(bounds:!n,field:geo.coordinates,precision:!n,shard_size:65535,size:65535))),fields:!((field:%27@timestamp%27,format:date_time),(field:%27relatedContent.article:modified_time%27,format:date_time),(field:%27relatedContent.article:published_time%27,format:date_time),(field:utc_time,format:date_time)),query:(bool:(filter:!((match_all:()),(range:(%27@timestamp%27:(format:strict_date_optional_time,gte:%272015-09-20T00:00:00.000Z%27,lte:%272015-09-20T01:00:00.000Z%27)))),must:!(),must_not:!(),should:!())),runtime_mappings:(),script_fields:(hour_of_day:(script:(lang:painless,source:%27doc[!%27@timestamp!%27].value.getHour()%27))),size:0,stored_fields:!(%27*%27))\
&requestType=point\
&geoFieldType=geo_point`
        )
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      const jsonTile = new VectorTile(new Protobuf(resp.body));
      const layer = jsonTile.layers[MVT_SOURCE_LAYER_NAME];
      expect(layer.length).to.be(1);
      const clusterFeature = layer.feature(0);
      expect(clusterFeature.type).to.be(1);
      expect(clusterFeature.extent).to.be(4096);
      expect(clusterFeature.id).to.be(undefined);
      expect(clusterFeature.properties).to.eql({ doc_count: 1, avg_of_bytes: 9252 });
      expect(clusterFeature.loadGeometry()).to.eql([[{ x: 87, y: 667 }]]);
    });

    it('should return vector tile containing grid features', async () => {
      const resp = await supertest
        .get(
          `/api/maps/mvt/getGridTile\
?x=2\
&y=3\
&z=3\
&geometryFieldName=geo.coordinates\
&index=logstash-*\
&requestBody=(_source:(excludes:!()),aggs:(gridSplit:(aggs:(avg_of_bytes:(avg:(field:bytes)),gridCentroid:(geo_centroid:(field:geo.coordinates))),geotile_grid:(bounds:!n,field:geo.coordinates,precision:!n,shard_size:65535,size:65535))),fields:!((field:%27@timestamp%27,format:date_time),(field:%27relatedContent.article:modified_time%27,format:date_time),(field:%27relatedContent.article:published_time%27,format:date_time),(field:utc_time,format:date_time)),query:(bool:(filter:!((match_all:()),(range:(%27@timestamp%27:(format:strict_date_optional_time,gte:%272015-09-20T00:00:00.000Z%27,lte:%272015-09-20T01:00:00.000Z%27)))),must:!(),must_not:!(),should:!())),runtime_mappings:(),script_fields:(hour_of_day:(script:(lang:painless,source:%27doc[!%27@timestamp!%27].value.getHour()%27))),size:0,stored_fields:!(%27*%27))\
&requestType=grid\
&geoFieldType=geo_point`
        )
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      const jsonTile = new VectorTile(new Protobuf(resp.body));
      const layer = jsonTile.layers[MVT_SOURCE_LAYER_NAME];
      expect(layer.length).to.be(2);

      const gridFeature = layer.feature(0);
      expect(gridFeature.type).to.be(3);
      expect(gridFeature.extent).to.be(4096);
      expect(gridFeature.id).to.be(undefined);
      expect(gridFeature.properties).to.eql({ doc_count: 1, avg_of_bytes: 9252 });
      expect(gridFeature.loadGeometry()).to.eql([
        [
          { x: 96, y: 640 },
          { x: 96, y: 672 },
          { x: 64, y: 672 },
          { x: 64, y: 640 },
          { x: 96, y: 640 },
        ],
      ]);

      const clusterFeature = layer.feature(1);
      expect(clusterFeature.type).to.be(1);
      expect(clusterFeature.extent).to.be(4096);
      expect(clusterFeature.id).to.be(undefined);
      expect(clusterFeature.properties).to.eql({
        doc_count: 1,
        avg_of_bytes: 9252,
        [KBN_IS_CENTROID_FEATURE]: true,
      });
      expect(clusterFeature.loadGeometry()).to.eql([[{ x: 80, y: 656 }]]);
    });
  });
}
