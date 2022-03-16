/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('getGridTile', () => {
    it('should return vector tile containing cluster features', async () => {
      const resp = await supertest
        .get(
          `/api/maps/mvt/getGridTile/3/2/3.pbf\
?geometryFieldName=geo.coordinates\
&index=logstash-*\
&gridPrecision=8\
&requestBody=(_source:(excludes:!()),aggs:(avg_of_bytes:(avg:(field:bytes))),fields:!((field:%27@timestamp%27,format:date_time),(field:%27relatedContent.article:modified_time%27,format:date_time),(field:%27relatedContent.article:published_time%27,format:date_time),(field:utc_time,format:date_time)),query:(bool:(filter:!((match_all:()),(range:(%27@timestamp%27:(format:strict_date_optional_time,gte:%272015-09-20T00:00:00.000Z%27,lte:%272015-09-20T01:00:00.000Z%27)))),must:!(),must_not:!(),should:!())),runtime_mappings:(),script_fields:(hour_of_day:(script:(lang:painless,source:%27doc[!%27@timestamp!%27].value.getHour()%27))),size:0,stored_fields:!(%27*%27))\
&requestType=point`
        )
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      expect(resp.headers['content-encoding']).to.be('gzip');
      expect(resp.headers['content-disposition']).to.be('inline');
      expect(resp.headers['content-type']).to.be('application/x-protobuf');
      expect(resp.headers['cache-control']).to.be('public, max-age=3600');

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
      expect(clusterFeature.loadGeometry()).to.eql([[{ x: 87, y: 667 }]]);

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
          { x: 4096, y: 4096 },
          { x: 4096, y: 0 },
          { x: 0, y: 0 },
          { x: 0, y: 4096 },
        ],
      ]);
    });

    it('should return vector tile containing grid features', async () => {
      const resp = await supertest
        .get(
          `/api/maps/mvt/getGridTile/3/2/3.pbf\
?geometryFieldName=geo.coordinates\
&index=logstash-*\
&gridPrecision=8\
&requestBody=(_source:(excludes:!()),aggs:(avg_of_bytes:(avg:(field:bytes))),fields:!((field:%27@timestamp%27,format:date_time),(field:%27relatedContent.article:modified_time%27,format:date_time),(field:%27relatedContent.article:published_time%27,format:date_time),(field:utc_time,format:date_time)),query:(bool:(filter:!((match_all:()),(range:(%27@timestamp%27:(format:strict_date_optional_time,gte:%272015-09-20T00:00:00.000Z%27,lte:%272015-09-20T01:00:00.000Z%27)))),must:!(),must_not:!(),should:!())),runtime_mappings:(),script_fields:(hour_of_day:(script:(lang:painless,source:%27doc[!%27@timestamp!%27].value.getHour()%27))),size:0,stored_fields:!(%27*%27))\
&requestType=grid`
        )
        .set('kbn-xsrf', 'kibana')
        .responseType('blob')
        .expect(200);

      expect(resp.headers['content-encoding']).to.be('gzip');
      expect(resp.headers['content-disposition']).to.be('inline');
      expect(resp.headers['content-type']).to.be('application/x-protobuf');
      expect(resp.headers['cache-control']).to.be('public, max-age=3600');

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
      expect(gridFeature.loadGeometry()).to.eql([
        [
          { x: 80, y: 672 },
          { x: 96, y: 672 },
          { x: 96, y: 656 },
          { x: 80, y: 656 },
          { x: 80, y: 672 },
        ],
      ]);

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
          { x: 4096, y: 4096 },
          { x: 4096, y: 0 },
          { x: 0, y: 0 },
          { x: 0, y: 4096 },
        ],
      ]);
    });
  });
}
