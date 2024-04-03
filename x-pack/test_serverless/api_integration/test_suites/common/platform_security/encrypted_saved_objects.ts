/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');

  describe('encrypted saved objects', function () {
    describe('route access', () => {
      describe('disabled', () => {
        it('rotate key', async () => {
          const { body, status } = await supertest
            .post('/api/encrypted_saved_objects/_rotate_key')
            .set(svlCommonApi.getCommonRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });
      });
    });
  });
}
