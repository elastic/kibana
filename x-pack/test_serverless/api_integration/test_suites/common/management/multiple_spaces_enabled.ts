/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { asyncForEach } from '@kbn/std';
import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

// Notes:
// This suite is currently only called from the feature flags test configs, e.g.
// x-pack/test_serverless/api_integration/test_suites/search/config.feature_flags.ts
// Configuration toggle:
// kbnServerArgs: ['--xpack.spaces.maxSpaces=100'],
//
// Initial test coverage limited to CRUD operations and ensuring disabling features/toggling feature visibility is not possible.
// Full coverage of x-pack/test/api_integration/apis/spaces & x-pack/test/spaces_api_integration
// should be converted into a deployment agnostic suite when spaces are
// permanently enabled in serverless.
//
// The route access tests for the spaces APIs in ./spaces.ts should also get updated at that time.

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const samlAuth = getService('samlAuth');

  // CRUD operations to become public APIs: https://github.com/elastic/kibana/issues/192153
  let supertestAdminWithApiKey: SupertestWithRoleScopeType;
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;

  async function createSpace(id: string) {
    await supertestAdminWithApiKey
      .post('/api/spaces/space')
      .send({
        id,
        name: id,
        disabledFeatures: [],
      })
      .expect(200);
  }

  async function deleteSpace(id: string) {
    await supertestAdminWithApiKey.delete(`/api/spaces/space/${id}`).expect(204);
  }

  describe('spaces', function () {
    before(async () => {
      supertestAdminWithApiKey = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withCommonHeaders: true,
      });
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });
    after(async () => {
      // delete any lingering spaces
      const { body } = await supertestAdminWithApiKey.get('/api/spaces/space').send().expect(200);

      const toDelete = (body as Array<{ id: string }>).filter((f) => f.id !== 'default');

      await asyncForEach(toDelete, async (space) => {
        await deleteSpace(space.id);
      });

      await supertestAdminWithApiKey.destroy();
    });

    describe('Create (POST /api/spaces/space)', () => {
      it('should allow us to create a space', async () => {
        await supertestAdminWithApiKey
          .post('/api/spaces/space')
          .send({
            id: 'custom_space_1',
            name: 'custom_space_1',
            disabledFeatures: [],
          })
          .expect(200);
      });

      it('should not allow us to create a space with disabled features', async () => {
        await supertestAdminWithApiKey
          .post('/api/spaces/space')
          .send({
            id: 'custom_space_2',
            name: 'custom_space_2',
            disabledFeatures: ['discover'],
          })
          .expect(400);
      });
    });

    describe('Read (GET /api/spaces/space)', () => {
      before(async () => {
        await createSpace('space_to_get_1');
        await createSpace('space_to_get_2');
        await createSpace('space_to_get_3');
      });

      after(async () => {
        await deleteSpace('space_to_get_1');
        await deleteSpace('space_to_get_2');
        await deleteSpace('space_to_get_3');
      });

      it('should allow us to get a space', async () => {
        await supertestAdminWithApiKey.get('/api/spaces/space/space_to_get_1').send().expect(200, {
          id: 'space_to_get_1',
          name: 'space_to_get_1',
          disabledFeatures: [],
        });
      });

      it('should allow us to get all spaces', async () => {
        const { body } = await supertestAdminWithApiKey.get('/api/spaces/space').send().expect(200);

        expect(body).toEqual(
          expect.arrayContaining([
            {
              _reserved: true,
              color: '#00bfb3',
              description: 'This is your default space!',
              disabledFeatures: [],
              id: 'default',
              name: 'Default',
            },
            { id: 'space_to_get_1', name: 'space_to_get_1', disabledFeatures: [] },
            { id: 'space_to_get_2', name: 'space_to_get_2', disabledFeatures: [] },
            { id: 'space_to_get_3', name: 'space_to_get_3', disabledFeatures: [] },
          ])
        );
      });
    });

    describe('Update (PUT /api/spaces/space)', () => {
      before(async () => {
        await createSpace('space_to_update');
      });

      after(async () => {
        await deleteSpace('space_to_update');
      });

      it('should allow us to update a space', async () => {
        await supertestAdminWithApiKey
          .put('/api/spaces/space/space_to_update')
          .send({
            id: 'space_to_update',
            name: 'some new name',
            initials: 'SN',
            disabledFeatures: [],
          })
          .expect(200);

        await supertestAdminWithApiKey.get('/api/spaces/space/space_to_update').send().expect(200, {
          id: 'space_to_update',
          name: 'some new name',
          initials: 'SN',
          disabledFeatures: [],
        });
      });

      it('should not allow us to update a space with disabled features', async () => {
        await supertestAdminWithApiKey
          .put('/api/spaces/space/space_to_update')
          .send({
            id: 'space_to_update',
            name: 'some new name',
            initials: 'SN',
            disabledFeatures: ['discover'],
          })
          .expect(400);
      });
    });

    describe('Delete (DELETE /api/spaces/space)', () => {
      it('should allow us to delete a space', async () => {
        await createSpace('space_to_delete');

        await supertestAdminWithApiKey.delete(`/api/spaces/space/space_to_delete`).expect(204);
      });
    });

    describe('Get active space (GET /internal/spaces/_active_space)', () => {
      before(async () => {
        await createSpace('foo-space');
      });

      after(async () => {
        await deleteSpace('foo-space');
      });

      it('returns the default space', async () => {
        const response = await supertestAdminWithCookieCredentials
          .get('/internal/spaces/_active_space')
          .expect(200);

        const { id, name, _reserved } = response.body;
        expect({ id, name, _reserved }).toEqual({
          id: 'default',
          name: 'Default',
          _reserved: true,
        });
      });

      it('returns the default space when explicitly referenced', async () => {
        const response = await supertestAdminWithCookieCredentials
          .get('/s/default/internal/spaces/_active_space')
          .expect(200);

        const { id, name, _reserved } = response.body;
        expect({ id, name, _reserved }).toEqual({
          id: 'default',
          name: 'Default',
          _reserved: true,
        });
      });

      it('returns the foo space', async () => {
        await supertestAdminWithCookieCredentials
          .get('/s/foo-space/internal/spaces/_active_space')
          .expect(200, {
            id: 'foo-space',
            name: 'foo-space',
            disabledFeatures: [],
          });
      });

      it('returns 404 when the space is not found', async () => {
        await supertestAdminWithCookieCredentials
          .get('/s/not-found-space/internal/spaces/_active_space')
          .expect(404, {
            statusCode: 404,
            error: 'Not Found',
            message: 'Saved object [space/not-found-space] not found',
          });
      });
    });

    // These tests just test access to API endpoints, in this case
    // when accessed without internal headers they will return 400
    // They will be included in deployment agnostic testing once spaces
    // are enabled in production.
    describe(`Access`, () => {
      describe(`internal`, () => {
        it('#getActiveSpace requires internal header', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestAdminWithApiKey
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

          ({ body, status } = await supertestAdminWithApiKey
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

        it('#copyToSpace requires internal header', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestAdminWithApiKey.post(
            '/api/spaces/_copy_saved_objects'
          ));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [post] exists but is not available with the current configuration'
            ),
          });

          ({ body, status } = await supertestAdminWithApiKey
            .post('/api/spaces/_copy_saved_objects')
            .set(samlAuth.getInternalRequestHeader()));

          svlCommonApi.assertResponseStatusCode(400, status, body);

          // expect 400 for missing body
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: '[request body]: expected a plain object value, but found [null] instead.',
          });
        });

        it('#resolveCopyToSpaceErrors requires internal header', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestAdminWithApiKey.post(
            '/api/spaces/_resolve_copy_saved_objects_errors'
          ));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [post] exists but is not available with the current configuration'
            ),
          });

          ({ body, status } = await supertestAdminWithApiKey
            .post('/api/spaces/_resolve_copy_saved_objects_errors')
            .set(samlAuth.getInternalRequestHeader()));

          svlCommonApi.assertResponseStatusCode(400, status, body);

          // expect 400 for missing body
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: '[request body]: expected a plain object value, but found [null] instead.',
          });
        });

        it('#updateObjectsSpaces requires internal header', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestAdminWithApiKey.post(
            '/api/spaces/_update_objects_spaces'
          ));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [post] exists but is not available with the current configuration'
            ),
          });

          ({ body, status } = await supertestAdminWithApiKey
            .post('/api/spaces/_update_objects_spaces')
            .set(samlAuth.getInternalRequestHeader()));

          svlCommonApi.assertResponseStatusCode(400, status, body);

          // expect 400 for missing body
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: '[request body]: expected a plain object value, but found [null] instead.',
          });
        });

        it('#getShareableReferences requires internal header', async () => {
          let body: any;
          let status: number;

          ({ body, status } = await supertestAdminWithApiKey.post(
            '/api/spaces/_get_shareable_references'
          ));
          // expect a rejection because we're not using the internal header
          expect(body).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: expect.stringContaining(
              'method [post] exists but is not available with the current configuration'
            ),
          });

          ({ body, status } = await supertestAdminWithApiKey
            .post('/api/spaces/_get_shareable_references')
            .set(samlAuth.getInternalRequestHeader())
            .send({
              objects: [{ type: 'a', id: 'a' }],
            }));

          svlCommonApi.assertResponseStatusCode(200, status, body);
        });
      });

      describe(`disabled`, () => {
        it('#disableLegacyUrlAliases', async () => {
          const { body, status } = await supertestAdminWithApiKey.post(
            '/api/spaces/_disable_legacy_url_aliases'
          );
          // without a request body we would normally a 400 bad request if the endpoint was registered
          svlCommonApi.assertApiNotFound(body, status);
        });
      });
    });
  });
}
