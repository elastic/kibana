/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');

  describe('security/misc', function () {
    describe('route access', () => {
      describe('disabled', () => {
        it('get index fields', async () => {
          const { body, status } = await supertest
            .get('/internal/security/fields/test')
            .set(svlCommonApi.getInternalRequestHeader())
            .send({ params: 'params' });
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('fix deprecated roles', async () => {
          const { body, status } = await supertest
            .post('/internal/security/deprecations/kibana_user_role/_fix_users')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('fix deprecated role mappings', async () => {
          const { body, status } = await supertest
            .post('/internal/security/deprecations/kibana_user_role/_fix_role_mappings')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get security checkup state', async () => {
          const { body, status } = await supertest
            .get('/internal/security/security_checkup/state')
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });
      });

      describe('internal', () => {
        it('get record auth type', async () => {
          const { status } = await supertest
            .post('/internal/security/analytics/_record_auth_type')
            .set(svlCommonApi.getInternalRequestHeader());
          expect(status).toBe(200);
        });
      });
    });
  });
}
