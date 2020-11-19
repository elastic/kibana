/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('getGridTile', () => {
    it('should validate params', async () => {
      await supertest
        .get(
          `/api/maps/mvt/getGridTile?x=0&y=0&z=0&geometryFieldName=coordinates&index=logstash*&requestBody=(_source:(excludes:!()),aggs:(gridSplit:(aggs:(gridCentroid:(geo_centroid:(field:coordinates))),geotile_grid:(bounds:!n,field:coordinates,precision:!n,shard_size:65535,size:65535))),docvalue_fields:!((field:%27@timestamp%27,format:date_time),(field:timestamp,format:date_time),(field:utc_time,format:date_time)),query:(bool:(filter:!((match_all:()),(range:(timestamp:(format:strict_date_optional_time,gte:%272020-09-16T13:57:36.734Z%27,lte:%272020-09-23T13:57:36.734Z%27)))),must:!(),must_not:!(),should:!())),script_fields:(hour_of_day:(script:(lang:painless,source:%27doc[!%27timestamp!%27].value.getHour()%27))),size:0,stored_fields:!(%27*%27))&requestType=point&geoFieldType=geo_point`
        )
        .set('kbn-xsrf', 'kibana')
        .expect(200);
    });

    it('should not validate when required params are missing', async () => {
      await supertest
        .get(
          `/api/maps/mvt/getGridTile?x=0&y=0&z=0&geometryFieldName=coordinates&index=logstash*&requestBody=(_source:(excludes:!()),aggs:(gridSplit:(aggs:(gridCentroid:(geo_centroid:(field:coordinates))),geotile_grid:(bounds:!n,field:coordinates,precision:!n,shard_size:65535,size:65535))),docvalue_fields:!((field:%27@timestamp%27,format:date_time),(field:timestamp,format:date_time),(field:utc_time,format:date_time)),query:(bool:(filter:!((match_all:()),(range:(timestamp:(format:strict_date_optional_time,gte:%272020-09-16T13:57:36.734Z%27,lte:%272020-09-23T13:57:36.734Z%27)))),must:!(),must_not:!(),should:!())),script_fields:(hour_of_day:(script:(lang:painless,source:%27doc[!%27timestamp!%27].value.getHour()%27))),size:0,stored_fields:!(%27*%27))&requestType=point`
        )
        .set('kbn-xsrf', 'kibana')
        .expect(400);
    });
  });
}
