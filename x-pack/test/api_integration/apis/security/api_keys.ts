/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('API Keys', () => {
    describe('GET /internal/security/api_key/_enabled', () => {
      it('should indicate that API Keys are enabled', async () => {
        await supertest
          .get('/internal/security/api_key/_enabled')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)
          .then((response: Record<string, any>) => {
            const payload = response.body;
            expect(payload).to.eql({ apiKeysEnabled: true });
          });
      });
    });
  });
}
