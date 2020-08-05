/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Header', () => {
    it("Injects 'kbn-license-sig' header to the all responses", async () => {
      const response = await supertest.get('/');

      expect(response.header).property('kbn-license-sig');
      expect(response.header['kbn-license-sig']).to.not.be.empty();
    });
  });
}
