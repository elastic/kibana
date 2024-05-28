/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let commonRequestHeader: Record<string, string>;
  let internalRequestHeader: Record<string, string>;
  let roleAuthc: RoleCredentials;

  describe('spaces', function () {
    before(async () => {
      // admin is the only predefined role that will work for all 3 solutions
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      commonRequestHeader = svlCommonApi.getCommonRequestHeader();
      internalRequestHeader = svlCommonApi.getInternalRequestHeader();
    });

    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    describe('route access', () => {
      describe('disabled', () => {
        it('#delete', async () => {
          const { body, status } = await supertestWithoutAuth
            .delete('/api/spaces/space/default')
            .set(internalRequestHeader)
            .set(roleAuthc.apiKeyHeader);

          // normally we'd get a 400 bad request if we tried to delete the default space
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('#create', async () => {
          const { body, status } = await supertestWithoutAuth
            .post('/api/spaces/space')
            .set(internalRequestHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              id: 'custom',
              name: 'Custom',
              disabledFeatures: [],
            });

          svlCommonApi.assertApiNotFound(body, status);
        });

        it('#update requires internal header', async () => {
          const { body, status } = await supertestWithoutAuth
            .put('/api/spaces/space/default')
            .set(internalRequestHeader)
            .set(roleAuthc.apiKeyHeader)
            .send({
              id: 'default',
              name: 'UPDATED!',
              disabledFeatures: [],
            });

          svlCommonApi.assertApiNotFound(body, status);
        });

        it('#copyToSpace', async () => {
          const { body, status } = await supertestWithoutAuth
            .post('/api/spaces/_copy_saved_objects')
            .set(internalRequestHeader)
            .set(roleAuthc.apiKeyHeader);

          // without a request body we would normally a 400 bad request if the endpoint was registered
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('#resolveCopyToSpaceErrors', async () => {
          const { body, status } = await supertestWithoutAuth
            .post('/api/spaces/_resolve_copy_saved_objects_errors')
            .set(internalRequestHeader)
            .set(roleAuthc.apiKeyHeader);

          // without a request body we would normally a 400 bad request if the endpoint was registered
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('#updateObjectsSpaces', async () => {
          const { body, status } = await supertestWithoutAuth
            .post('/api/spaces/_update_objects_spaces')
            .set(internalRequestHeader)
            .set(roleAuthc.apiKeyHeader);

          // without a request body we would normally a 400 bad request if the endpoint was registered
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('#getShareableReferences', async () => {
          const { body, status } = await supertestWithoutAuth
            .post('/api/spaces/_get_shareable_references')
            .set(internalRequestHeader)
            .set(roleAuthc.apiKeyHeader);

          // without a request body we would normally a 400 bad request if the endpoint was registered
          svlCommonApi.assertApiNotFound(body, status);
        });

        it('#disableLegacyUrlAliases', async () => {
          const { body, status } = await supertestWithoutAuth
            .post('/api/spaces/_disable_legacy_url_aliases')
            .set(internalRequestHeader)
            .set(roleAuthc.apiKeyHeader);

          // without a request body we would normally a 400 bad request if the endpoint was registered
          svlCommonApi.assertApiNotFound(body, status);
        });
      });

      describe('internal', () => {
        it('#get requires internal header', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestWithoutAuth
            .get('/api/spaces/space/default')
            .set(commonRequestHeader)
            .set(roleAuthc.apiKeyHeader));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [get] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestWithoutAuth
            .get('/api/spaces/space/default')
            .set(internalRequestHeader)
            .set(roleAuthc.apiKeyHeader));
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

          ({ body, status } = await supertestWithoutAuth
            .get('/api/spaces/space')
            .set(commonRequestHeader)
            .set(roleAuthc.apiKeyHeader));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [get] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestWithoutAuth
            .get('/api/spaces/space')
            .set(internalRequestHeader)
            .set(roleAuthc.apiKeyHeader));
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

          ({ body, status } = await supertestWithoutAuth
            .get('/internal/spaces/_active_space')
            .set(commonRequestHeader)
            .set(roleAuthc.apiKeyHeader));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [get] exists but is not available with the current configuration'
            ),
          });
          expect(status).toBe(400);

          ({ body, status } = await supertestWithoutAuth
            .get('/internal/spaces/_active_space')
            .set(internalRequestHeader)
            .set(roleAuthc.apiKeyHeader));
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
