/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('index feature data', () => {
    it('should add point data to an existing index', async () => {
      await supertest
        .post(`/internal/maps/docSource`)
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({
          index: 'new-point-feature-index',
          mappings: { properties: { coordinates: { type: 'geo_point' } } },
        });

      const resp = await supertest
        .post(`/internal/maps/feature`)
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({
          index: 'new-point-feature-index',
          data: { coordinates: [125.6, 10.1], name: 'Dinagat Islands' },
        })
        .expect(200);

      expect(resp.body.success).to.be(true);
    });

    it('should add shape data to an existing index', async () => {
      await supertest
        .post(`/internal/maps/docSource`)
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({
          index: 'new-shape-feature-index',
          mappings: { properties: { coordinates: { type: 'geo_shape' } } },
        });

      const resp = await supertest
        .post(`/internal/maps/feature`)
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({
          index: 'new-shape-feature-index',
          data: {
            coordinates: {
              type: 'Polygon',
              coordinates: [
                [
                  [-20.91796875, 25.64152637306577],
                  [-13.0517578125, 25.64152637306577],
                  [-13.0517578125, 31.203404950917395],
                  [-20.91796875, 31.203404950917395],
                  [-20.91796875, 25.64152637306577],
                ],
              ],
            },
          },
        })
        .expect(200);

      expect(resp.body.success).to.be(true);
    });

    it('should fail if data is invalid', async () => {
      await supertest
        .post(`/internal/maps/docSource`)
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({
          index: 'new-feature-index2',
          mappings: { properties: { coordinates: { type: 'geo_point' } } },
        });
      await supertest
        .post(`/internal/maps/feature`)
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({
          index: 'new-feature-index2',
          data: { coordinates: [600, 800], name: 'Never Gonna Happen Islands' },
        })
        .expect(500);
    });

    it('should fail if index does not exist', async () => {
      await supertest
        .post(`/internal/maps/feature`)
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send({
          index: 'not-an-index',
          data: { coordinates: [125.6, 10.1], name: 'Dinagat Islands' },
        })
        .expect(500);
    });
  });
}
