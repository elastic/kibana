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

  describe('security/role_mappings', function () {
    describe('route access', () => {
      describe('disabled', () => {
        it('create/update role mapping', async () => {
          const { body, status } = await supertest
            .post('/internal/security/role_mapping/test')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get role mapping', async () => {
          const { body, status } = await supertest
            .get('/internal/security/role_mapping/test')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get all role mappings', async () => {
          const { body, status } = await supertest
            .get('/internal/security/role_mapping')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('delete role mapping', async () => {
          // this test works because the message for a missing endpoint is different from a missing role mapping
          const { body, status } = await supertest
            .delete('/internal/security/role_mapping/test')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('role mapping feature check', async () => {
          const { body, status } = await supertest
            .get('/internal/security/_check_role_mapping_features')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });
      });
    });
  });
}
