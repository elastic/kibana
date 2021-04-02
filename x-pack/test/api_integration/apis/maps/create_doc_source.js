/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('doc source creation', () => {
    it('should create a new index and pattern but not clobber an existing one', async () => {
      const resp = await supertest
        .post(`/api/maps/docSource`)
        .set('kbn-xsrf', 'kibana')
        .send({
          index: 'testing123',
          mappings: { properties: { coordinates: { type: 'geo_point' } } },
        })
        .expect(200);

      expect(resp.body.success).to.be(true);

      // Repeated index fails. We don't want the user clobbering indexes
      await supertest
        .post(`/api/maps/docSource`)
        .set('kbn-xsrf', 'kibana')
        .send({
          index: 'testing123',
          mappings: { properties: { coordinates: { type: 'geo_point' } } },
        })
        .expect(500);
    });

    it('should fail to create index and pattern with invalid index', async () => {
      await supertest
        .post(`/api/maps/docSource`)
        .set('kbn-xsrf', 'kibana')
        .send({
          index: '_testing456',
          mappings: { properties: { coordinates: { type: 'geo_point' } } },
        })
        .expect(500);
    });
  });
}
