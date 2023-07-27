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

  describe('security/user_profiles', function () {
    describe('route access', () => {
      describe('disabled', () => {
        it('update', async () => {
          const { body, status } = await supertest
            .post(`/internal/security/user_profile/_data`)
            .set(svlCommonApi.getInternalRequestHeader())
            .send({ key: 'value' });
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('get current', async () => {
          const { body, status } = await supertest
            .get(`/internal/security/user_profile`)
            .set(svlCommonApi.getInternalRequestHeader());
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('bulk get', async () => {
          const { body, status } = await supertest
            .get(`/internal/security/user_profile`)
            .set(svlCommonApi.getInternalRequestHeader())
            .send({ uids: ['12345678'] });
          svlCommonApi.assertApiNotFound(body, status);
        });
      });
    });
  });
}
