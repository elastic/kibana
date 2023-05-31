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

  describe('get matching index patterns', () => {
    it('should return an array containing indexes matching pattern', async () => {
      const resp = await supertest
        .get(`/internal/maps/getMatchingIndexes?indexPattern=geo_shapes`)
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send()
        .expect(200);

      expect(resp.body.success).to.be(true);
      expect(resp.body.matchingIndexes.length).to.be(1);
    });

    it('should return an empty array when no indexes match pattern', async () => {
      const resp = await supertest
        .get(`/internal/maps/getMatchingIndexes?indexPattern=notAnIndex`)
        .set('kbn-xsrf', 'kibana')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send()
        .expect(200);

      expect(resp.body.success).to.be(true);
      expect(resp.body.matchingIndexes.length).to.be(0);
    });
  });
}
