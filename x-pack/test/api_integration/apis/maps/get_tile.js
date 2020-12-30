/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('getTile', () => {
    it('should validate params', async () => {
      await supertest
        .get(
          `/api/maps/mvt/getTile?x=15&y=11&z=5&geometryFieldName=coordinates&index=logstash*&requestBody=(_source:(includes:!(coordinates)),docvalue_fields:!(),query:(bool:(filter:!((match_all:())),must:!(),must_not:!(),should:!())),script_fields:(),size:10000,stored_fields:!(coordinates))&geoFieldType=geo_point`
        )
        .set('kbn-xsrf', 'kibana')
        .expect(200);
    });

    it('should not validate when required params are missing', async () => {
      await supertest
        .get(
          `/api/maps/mvt/getTile?&index=logstash*&requestBody=(_source:(includes:!(coordinates)),docvalue_fields:!(),query:(bool:(filter:!((match_all:())),must:!(),must_not:!(),should:!())),script_fields:(),size:10000,stored_fields:!(coordinates))`
        )
        .set('kbn-xsrf', 'kibana')
        .expect(400);
    });
  });
}
