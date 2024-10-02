/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const samlAuth = getService('samlAuth');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithApiKey: SupertestWithRoleScopeType;
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;

  describe('spaces', function () {
    before(async () => {
      // admin is the only predefined role that will work for all 3 solutions
      supertestAdminWithApiKey = await roleScopedSupertest.getSupertestWithRoleScope('admin');
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
        }
      );
    });

    after(async () => {
      await supertestAdminWithApiKey.destroy();
    });

    describe('route access', () => {
      it('#delete', async () => {
        const { body, status } = await supertestAdminWithApiKey
          .delete('/api/spaces/space/default')
          .set(samlAuth.getInternalRequestHeader());

        svlCommonApi.assertResponseStatusCode(400, status, body);
      });

      // Skipped due to change in QA environment for role management and spaces
      // TODO: revisit once the change is rolled out to all environments
      it.skip('#create', async () => {
        const { body, status } = await supertestAdminWithApiKey
          .post('/api/spaces/space')
          .set(samlAuth.getInternalRequestHeader())
          .send({
            id: 'custom',
            name: 'Custom',
            disabledFeatures: [],
          });

        svlCommonApi.assertResponseStatusCode(400, status, body);
      });

      it('#update requires internal header', async () => {
        const { body, status } = await supertestAdminWithApiKey
          .put('/api/spaces/space/default')
          .set(samlAuth.getInternalRequestHeader())
          .send({
            id: 'default',
            name: 'UPDATED!',
            disabledFeatures: [],
          });

        svlCommonApi.assertResponseStatusCode(200, status, body);
      });

      it('#copyToSpace', async () => {
        const { body, status } = await supertestAdminWithApiKey
          .post('/api/spaces/_copy_saved_objects')
          .set(samlAuth.getInternalRequestHeader());

        svlCommonApi.assertResponseStatusCode(400, status, body);
      });

      it('#resolveCopyToSpaceErrors', async () => {
        const { body, status } = await supertestAdminWithApiKey
          .post('/api/spaces/_resolve_copy_saved_objects_errors')
          .set(samlAuth.getInternalRequestHeader());

        svlCommonApi.assertResponseStatusCode(400, status, body);
      });

      it('#updateObjectsSpaces', async () => {
        const { body, status } = await supertestAdminWithApiKey
          .post('/api/spaces/_update_objects_spaces')
          .set(samlAuth.getInternalRequestHeader());

        svlCommonApi.assertResponseStatusCode(400, status, body);
      });

      it('#getShareableReferences', async () => {
        const { body, status } = await supertestAdminWithApiKey
          .post('/api/spaces/_get_shareable_references')
          .set(samlAuth.getInternalRequestHeader())
          .send({
            objects: [{ type: 'a', id: 'a' }],
          });

        svlCommonApi.assertResponseStatusCode(200, status, body);
      });

      it('#disableLegacyUrlAliases', async () => {
        const { body, status } = await supertestAdminWithApiKey
          .post('/api/spaces/_disable_legacy_url_aliases')
          .set(samlAuth.getInternalRequestHeader());

        // without a request body we would normally a 400 bad request if the endpoint was registered
        svlCommonApi.assertApiNotFound(body, status);
      });

      describe('internal', () => {
        it('#get requires internal header', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestAdminWithApiKey
            .get('/api/spaces/space/default')
            .set(samlAuth.getCommonRequestHeader()));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [get] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestAdminWithApiKey
            .get('/api/spaces/space/default')
            .set(samlAuth.getInternalRequestHeader()));
          // expect success because we're using the internal header
          expect(body).toEqual(
            expect.objectContaining({
              id: 'default',
            })
          );
          expect(status).toBe(200);
        });

        it('#getAll requires internal header', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestAdminWithApiKey
            .get('/api/spaces/space')
            .set(samlAuth.getCommonRequestHeader()));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [get] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestAdminWithApiKey
            .get('/api/spaces/space')
            .set(samlAuth.getInternalRequestHeader()));
          // expect success because we're using the internal header
          expect(body).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: 'default',
              }),
            ])
          );
          expect(status).toBe(200);
        });

        it('#getActiveSpace requires internal header', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestAdminWithCookieCredentials
            .get('/internal/spaces/_active_space')
            .set(samlAuth.getCommonRequestHeader()));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [get] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestAdminWithCookieCredentials
            .get('/internal/spaces/_active_space')
            .set(samlAuth.getInternalRequestHeader()));
          // expect success because we're using the internal header
          expect(body).toEqual(
            expect.objectContaining({
              id: 'default',
            })
          );
          expect(status).toBe(200);
        });
      });
    });

    // TODO: Re-enable test-suite once users can create and update spaces in the Serverless offering.
    // it('rejects request to update a space with disabledFeatures', async () => {
    //   const { body, status } = await supertest
    //     .put('/api/spaces/space/default')
    //     .set(svlCommonApi.getInternalRequestHeader())
    //     .send({
    //       id: 'custom',
    //       name: 'Custom',
    //       disabledFeatures: ['some-feature'],
    //     });
    //
    //   // in a non-serverless environment this would succeed with a 200
    //   expect(body).toEqual({
    //     statusCode: 400,
    //     error: 'Bad Request',
    //     message:
    //       'Unable to update Space, the disabledFeatures array must be empty when xpack.spaces.allowFeatureVisibility setting is disabled',
    //   });
    //   expect(status).toBe(400);
    // });
  });
}
