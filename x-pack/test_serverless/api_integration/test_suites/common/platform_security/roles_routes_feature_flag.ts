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

  describe('security', function () {
    describe('route access', () => {
      describe('roles', () => {
        describe('enabled', () => {
          it('get role', async () => {
            const { body, status } = await supertest
              .get('/api/security/role/superuser')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertResponseStatusCode(200, status, body);
          });

          it('get all roles', async () => {
            const { body, status } = await supertest
              .get('/api/security/role')
              .set(svlCommonApi.getInternalRequestHeader());
            svlCommonApi.assertResponseStatusCode(200, status, body);
          });
        });

        describe('moved', () => {
          it('delete role', async () => {
            const { body, status } = await supertest
              .delete('/api/security/role/superuser')
              .set(svlCommonApi.getInternalRequestHeader());

            svlCommonApi.assertResponseStatusCode(410, status, body);
          });

          it('create/update role', async () => {
            const role = {
              elasticsearch: {
                cluster: [],
                indices: [{ names: ['test'], privileges: ['read'] }],
                run_as: [],
              },
              kibana: [],
            };

            const { body, status } = await supertest
              .put('/api/security/role/myRole')
              .send(role)
              .set(svlCommonApi.getInternalRequestHeader());

            svlCommonApi.assertResponseStatusCode(410, status, body);
          });
        });
      });
    });
  });
}
