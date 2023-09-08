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

  describe('index settings', () => {
    it('should return default index settings when max_result_window and max_inner_result_window are not set', async () => {
      const resp = await supertest
        .get(`/internal/maps/indexSettings?indexPatternTitle=logstash*`)
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);

      expect(resp.body.maxResultWindow).to.be(10000);
      expect(resp.body.maxInnerResultWindow).to.be(100);
    });

    it('should return index settings', async () => {
      const resp = await supertest
        .get(`/internal/maps/indexSettings?indexPatternTitle=geo_shape*`)
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);

      expect(resp.body.maxResultWindow).to.be(10001);
      expect(resp.body.maxInnerResultWindow).to.be(101);
    });
  });
}
