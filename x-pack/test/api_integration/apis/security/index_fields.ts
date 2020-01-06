/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Index Fields', () => {
    describe('GET /internal/security/fields/{query}', () => {
      it('should return a list of available index mapping fields', async () => {
        await supertest
          .get('/internal/security/fields/.kibana')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)
          .then((response: Record<string, any>) => {
            const sampleOfExpectedFields = [
              'type',
              'visualization.title',
              'dashboard.title',
              'search.columns',
              'space.name',
            ];

            sampleOfExpectedFields.forEach(field => expect(response.body).to.contain(field));
          });
      });
    });
  });
}
