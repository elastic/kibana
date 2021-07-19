/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('validate drawing index', () => {
    it('confirm valid drawing index', async () => {
      await supertest
        .post(`/api/maps/docSource`)
        .set('kbn-xsrf', 'kibana')
        .send({
          index: 'valid-drawing-index',
          mappings: { properties: { coordinates: { type: 'geo_point' } } },
        });

      const resp = await supertest
        .get(`/api/maps/checkIsDrawingIndex?index=valid-drawing-index`)
        .set('kbn-xsrf', 'kibana')
        .expect(200);

      expect(resp.body.success).to.be(true);
      expect(resp.body.isDrawingIndex).to.be(true);
    });

    it('confirm valid index that is not a drawing index', async () => {
      const resp = await supertest
        .get(`/api/maps/checkIsDrawingIndex?index=geo_shapes`)
        .set('kbn-xsrf', 'kibana')
        .expect(200);

      expect(resp.body.success).to.be(true);
      expect(resp.body.isDrawingIndex).to.be(false);
    });

    it('confirm invalid index', async () => {
      const resp = await supertest
        .get(`/api/maps/checkIsDrawingIndex?index=not-an-index`)
        .set('kbn-xsrf', 'kibana')
        .expect(200);

      expect(resp.body.success).to.be(false);
    });
  });
}
