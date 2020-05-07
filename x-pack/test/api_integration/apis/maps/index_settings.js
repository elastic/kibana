/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService }) {
  const supertest = getService('supertest');

  describe('index settings', () => {
    it('should return index settings', async () => {
      const resp = await supertest
        .get(`/api/maps/indexSettings?indexPatternTitle=logstash*`)
        .set('kbn-xsrf', 'kibana')
        .expect(200);

      expect(resp.body.maxResultWindow).to.be(10000);
      expect(resp.body.maxInnerResultWindow).to.be(100);
    });
  });
}
