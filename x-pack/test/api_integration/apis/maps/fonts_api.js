/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('fonts', () => {
    it('should return fonts', async () => {
      const resp = await supertest
        .get(`/api/maps/fonts/Open%20Sans%20Regular,Arial%20Unicode%20MS%20Regular/0-255`)
        .expect(200);

      expect(resp.body.length).to.be(74696);
    });
  });
}
