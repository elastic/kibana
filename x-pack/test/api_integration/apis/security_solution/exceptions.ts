/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('artifact download', () => {
    before(() => esArchiver.load('security_solution/exceptions/api_feature/exception_list'));
    after(() => esArchiver.unload('security_solution/exceptions/api_feature/exception_list'));

    it('should fail to find artifact with invalid hash', async () => {
      const { body } = await supertest
        .get('/api/endpoint/allowlist/download/endpoint-allowlist-windows-1.0.0/abcd')
        .send()
        .expect(404);
    });

    it('should download an artifact with correct hash', async () => {
      const { body } = await supertest
        .get(
          '/api/endpoint/allowlist/download/endpoint-allowlist-windows-1.0.0/1825fb19fcc6dc391cae0bc4a2e96dd7f728a0c3ae9e1469251ada67f9e1b975'
        )
        .send()
        .expect(200);
    });
  });
}
