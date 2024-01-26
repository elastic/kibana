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

  describe('security/anonymous', function () {
    describe('route access', () => {
      describe('disabled', () => {
        it('get access capabilities', async () => {
          const { body, status } = await supertest
            .get('/internal/security/anonymous_access/capabilities')
            .set(svlCommonApi.getCommonRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get access state', async () => {
          const { body, status } = await supertest
            .get('/internal/security/anonymous_access/state')
            .set(svlCommonApi.getCommonRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });
      });
    });
  });
}
