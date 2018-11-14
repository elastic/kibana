/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { API_BASE_PATH } from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('remote clusters', () => {
    describe('clusters()', () => {
      it('should return an empty object when there are no remote clusters', async () => {
        const uri = `${API_BASE_PATH}/clusters`;

        const { body } = await supertest
          .get(uri)
          .expect(200);

        expect(Object.keys(body).length).to.eql(0);
      });

      // TODO: Add more tests when the Create API route is done
    });
  });
}
