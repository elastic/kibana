/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { API_BASE_PATH } from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('auto follow patterns', () => {
    describe('list()', () => {
      it('should return an empty object when there are no auto follow patterns', async () => {
        const uri = `${API_BASE_PATH}/auto_follow_patterns`;

        const { body } = await supertest
          .get(uri)
          .expect(200);

        expect(body).to.eql({});
      });

      // TODO: Add more tests when the Create API route is done
    });
  });
}
