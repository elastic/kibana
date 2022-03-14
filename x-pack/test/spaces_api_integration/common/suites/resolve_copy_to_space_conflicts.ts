/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { EsArchiver } from '@kbn/es-archiver';
import { SavedObject } from 'src/core/server';
import { DEFAULT_SPACE_ID } from '../../../../plugins/spaces/common/constants';
import { CopyResponse } from '../../../../plugins/spaces/server/lib/copy_to_spaces';
import { getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

type TestResponse = Record<string, any>;

interface ResolveCopyToSpaceTest {
  statusCode: number;
  response: (resp: TestResponse) => Promise<void>;
}

interface ResolveCopyToSpaceMultiNamespaceTest extends ResolveCopyToSpaceTest {
  testTitle: string;
  objects: Array<Record<string, any>>;
  retries: Record<string, any>;
}

interface ResolveCopyToSpaceTests {
  withReferencesNotOverwriting: ResolveCopyToSpaceTest;
  withReferencesOverwriting: ResolveCopyToSpaceTest;
  withoutReferencesOverwriting: ResolveCopyToSpaceTest;
  withoutReferencesNotOverwriting: ResolveCopyToSpaceTest;
  nonExistentSpace: ResolveCopyToSpaceTest;
  multiNamespaceTestCases: () => ResolveCopyToSpaceMultiNamespaceTest[];
}

interface ResolveCopyToSpaceTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  tests: ResolveCopyToSpaceTests;
}

const NON_EXISTENT_SPACE_ID = 'non_existent_space';

const getDestinationSpace = (originSpaceId?: string) => {
  if (!originSpaceId || originSpaceId === DEFAULT_SPACE_ID) {
    return 'space_1';
  }
  return DEFAULT_SPACE_ID;
};

export function resolveCopyToSpaceConflictsSuite(
  esArchiver: EsArchiver,
  supertestWithAuth: SuperTest<any>,
  supertestWithoutAuth: SuperTest<any>
) {
  const getVisualizationAtSpace = async (spaceId: string): Promise<SavedObject<any>> => {
    return supertestWithAuth
      .get(`${getUrlPrefix(spaceId)}/api/saved_objects/visualization/cts_vis_3_${spaceId}`)
      .then((response: any) => response.body);
  };
  const getDashboardAtSpace = async (spaceId: string): Promise<SavedObject<any>> => {
    return supertestWithAuth
      .get(`${getUrlPrefix(spaceId)}/api/saved_objects/dashboard/cts_dashboard_${spaceId}`)
      .then((response: any) => response.body);
  };

  const getObjectsAtSpace = async (
    spaceId: string
  ): Promise<[SavedObject<any>, SavedObject<any>]> => {
    const dashboard = await getDashboardAtSpace(spaceId);
    const visualization = await getVisualizationAtSpace(spaceId);
    return [dashboard, visualization];
  };

  const createExpectOverriddenResponseWithReferences =
    (sourceSpaceId: string) => async (response: TestResponse) => {
      const destination = getDestinationSpace(sourceSpaceId);
      const result = response.body;
      expect(result).to.eql({
        [destination]: {
          success: true,
          successCount: 2,
          successResults: [
            {
              id: `cts_ip_1_${sourceSpaceId}`,
              type: 'index-pattern',
              meta: {
                title: `Copy to Space index pattern 1 from ${sourceSpaceId} space`,
                icon: 'indexPatternApp',
              },
              destinationId: `cts_ip_1_${destination}`, // this conflicted with another index pattern in the destination space because of a shared originId
              overwrite: true,
            },
            {
              id: `cts_vis_3_${sourceSpaceId}`,
              type: 'visualization',
              meta: {
                title: `CTS vis 3 from ${sourceSpaceId} space`,
                icon: 'visualizeApp',
              },
              destinationId: `cts_vis_3_${destination}`, // this conflicted with another visualization in the destination space because of a shared originId
              overwrite: true,
            },
          ],
        },
      });
      const [dashboard, visualization] = await getObjectsAtSpace(destination);
      expect(dashboard.attributes.title).to.eql(
        `This is the ${destination} test space CTS dashboard`
      );
      expect(visualization.attributes.title).to.eql(`CTS vis 3 from ${sourceSpaceId} space`);
    };

  const createExpectOverriddenResponseWithoutReferences =
    (sourceSpaceId: string, destinationSpaceId: string = getDestinationSpace(sourceSpaceId)) =>
    async (response: TestResponse) => {
      const result = response.body;
      expect(result).to.eql({
        [destinationSpaceId]: {
          success: true,
          successCount: 1,
          successResults: [
            {
              id: `cts_dashboard_${sourceSpaceId}`,
              type: 'dashboard',
              meta: {
                title: `This is the ${sourceSpaceId} test space CTS dashboard`,
                icon: 'dashboardApp',
              },
              destinationId: `cts_dashboard_${destinationSpaceId}`, // this conflicted with another dashboard in the destination space because of a shared originId
              overwrite: true,
            },
          ],
        },
      });
      const [dashboard, visualization] = await getObjectsAtSpace(destinationSpaceId);
      expect(dashboard.attributes.title).to.eql(
        `This is the ${sourceSpaceId} test space CTS dashboard`
      );
      if (destinationSpaceId === NON_EXISTENT_SPACE_ID) {
        expect((visualization as any).statusCode).to.eql(404);
      } else {
        expect(visualization.attributes.title).to.eql(`CTS vis 3 from ${destinationSpaceId} space`);
      }
    };

  const createExpectNonOverriddenResponseWithReferences =
    (sourceSpaceId: string) => async (response: TestResponse) => {
      const destination = getDestinationSpace(sourceSpaceId);

      const result = response.body;
      expect(result).to.eql({
        [destination]: {
          success: false,
          successCount: 0,
          errors: [
            {
              error: {
                type: 'conflict',
                destinationId: `cts_ip_1_${destination}`, // this conflicted with another index pattern in the destination space because of a shared originId
              },
              id: `cts_ip_1_${sourceSpaceId}`,
              meta: {
                title: `Copy to Space index pattern 1 from ${sourceSpaceId} space`,
                icon: 'indexPatternApp',
              },
              type: 'index-pattern',
            },
            {
              error: {
                type: 'conflict',
                destinationId: `cts_vis_3_${destination}`, // this conflicted with another visualization in the destination space because of a shared originId
              },
              id: `cts_vis_3_${sourceSpaceId}`,
              meta: {
                title: `CTS vis 3 from ${sourceSpaceId} space`,
                icon: 'visualizeApp',
              },
              type: 'visualization',
            },
          ],
        },
      });

      const [dashboard, visualization] = await getObjectsAtSpace(destination);
      expect(dashboard.attributes.title).to.eql(
        `This is the ${destination} test space CTS dashboard`
      );
      expect(visualization.attributes.title).to.eql(`CTS vis 3 from ${destination} space`);
    };

  const createExpectNonOverriddenResponseWithoutReferences =
    (sourceSpaceId: string) => async (response: TestResponse) => {
      const destination = getDestinationSpace(sourceSpaceId);

      const result = response.body;
      expect(result).to.eql({
        [destination]: {
          success: false,
          successCount: 0,
          errors: [
            {
              error: {
                type: 'conflict',
                destinationId: `cts_dashboard_${destination}`, // this conflicted with another visualization in the destination space because of a shared originId
              },
              id: `cts_dashboard_${sourceSpaceId}`,
              type: 'dashboard',
              meta: {
                title: `This is the ${sourceSpaceId} test space CTS dashboard`,
                icon: 'dashboardApp',
              },
            },
          ],
        },
      });

      const [dashboard, visualization] = await getObjectsAtSpace(destination);
      expect(dashboard.attributes.title).to.eql(
        `This is the ${destination} test space CTS dashboard`
      );
      expect(visualization.attributes.title).to.eql(`CTS vis 3 from ${destination} space`);
    };

  const expectRouteForbiddenResponse = async (resp: TestResponse) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Forbidden',
    });
  };

  const expectRouteNotFoundResponse = async (resp: TestResponse) => {
    expect(resp.body).to.eql({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found',
    });
  };

  const createExpectUnauthorizedAtSpaceWithReferencesResult =
    (spaceId: string = DEFAULT_SPACE_ID) =>
    async (resp: TestResponse) => {
      const destination = getDestinationSpace(spaceId);

      const result = resp.body as CopyResponse;
      expect(result).to.eql({
        [destination]: {
          success: false,
          successCount: 0,
          errors: [
            {
              statusCode: 403,
              error: 'Forbidden',
              message: 'Unable to bulk_create index-pattern,visualization',
            },
          ],
        },
      } as CopyResponse);

      // Query ES to ensure that nothing was copied
      const [dashboard, visualization] = await getObjectsAtSpace(destination);
      expect(dashboard.attributes.title).to.eql(
        `This is the ${destination} test space CTS dashboard`
      );
      expect(visualization.attributes.title).to.eql(`CTS vis 3 from ${destination} space`);
    };

  const createExpectUnauthorizedAtSpaceWithoutReferencesResult =
    (
      sourceSpaceId: string = DEFAULT_SPACE_ID,
      destinationSpaceId: string = getDestinationSpace(sourceSpaceId)
    ) =>
    async (resp: TestResponse) => {
      const result = resp.body as CopyResponse;
      expect(result).to.eql({
        [destinationSpaceId]: {
          success: false,
          successCount: 0,
          errors: [
            {
              statusCode: 403,
              error: 'Forbidden',
              message: 'Unable to bulk_create dashboard',
            },
          ],
        },
      } as CopyResponse);

      // Query ES to ensure that nothing was copied
      const [dashboard, visualization] = await getObjectsAtSpace(destinationSpaceId);

      if (destinationSpaceId === NON_EXISTENT_SPACE_ID) {
        expect((dashboard as any).statusCode).to.eql(404);
        expect((visualization as any).statusCode).to.eql(404);
      } else {
        expect(dashboard.attributes.title).to.eql(
          `This is the ${destinationSpaceId} test space CTS dashboard`
        );
        expect(visualization.attributes.title).to.eql(`CTS vis 3 from ${destinationSpaceId} space`);
      }
    };

  /**
   * Creates test cases for multi-namespace saved object types.
   * Note: these are written with the assumption that test data will only be reloaded between each group of test cases, *not* before every
   * single test case. This saves time during test execution.
   */
  const createMultiNamespaceTestCases =
    (
      spaceId: string,
      outcome: 'authorized' | 'unauthorizedRead' | 'unauthorizedWrite' | 'noAccess' = 'authorized'
    ) =>
    (): ResolveCopyToSpaceMultiNamespaceTest[] => {
      // the status code of the HTTP response differs depending on the error type
      // a 403 error actually comes back as an HTTP 200 response
      const statusCode = outcome === 'noAccess' ? 403 : 200;
      const type = 'sharedtype';
      const exactMatchId = 'each_space';
      const inexactMatchIdA = `conflict_1a_${spaceId}`;
      const inexactMatchIdB = `conflict_1b_${spaceId}`;
      const inexactMatchIdC = `conflict_1c_default_and_space_1`;
      const ambiguousConflictId = `conflict_2_${spaceId}`;

      const createRetries = (overwriteRetry: Record<string, any>) => ({
        space_2: [overwriteRetry],
      });
      const getResult = (response: TestResponse) => (response.body as CopyResponse).space_2;
      const expectSavedObjectForbiddenResponse = (response: TestResponse) => {
        expect(response.body).to.eql({
          space_2: {
            success: false,
            successCount: 0,
            errors: [
              { statusCode: 403, error: 'Forbidden', message: `Unable to bulk_create sharedtype` },
            ],
          },
        });
      };
      const expectSavedObjectSuccessResponse = (
        response: TestResponse,
        id: string,
        destinationId?: string
      ) => {
        const { success, successCount, successResults, errors } = getResult(response);
        expect(success).to.eql(true);
        expect(successCount).to.eql(1);
        expect(errors).to.be(undefined);
        const title = (() => {
          switch (id) {
            case exactMatchId:
              return 'A shared saved-object in the default, space_1, and space_2 spaces';
            case inexactMatchIdA:
              return 'This is used to test an inexact match conflict for an originId -> originId match';
            case inexactMatchIdB:
              return 'This is used to test an inexact match conflict for an originId -> id match';
            case inexactMatchIdC:
              return 'This is used to test an inexact match conflict for an id -> originId match';
            default:
              return 'A shared saved-object in one space';
          }
        })();
        const meta = { title, icon: 'beaker' };
        expect(successResults).to.eql([
          { type, id, meta, overwrite: true, ...(destinationId && { destinationId }) },
        ]);
      };

      return [
        {
          testTitle: 'copying with an exact match conflict',
          objects: [{ type, id: exactMatchId }],
          retries: createRetries({ type, id: exactMatchId, overwrite: true }),
          statusCode,
          response: async (response: TestResponse) => {
            if (outcome === 'authorized') {
              expectSavedObjectSuccessResponse(response, exactMatchId);
            } else if (outcome === 'noAccess') {
              expectRouteForbiddenResponse(response);
            } else {
              // unauthorized read/write
              expectSavedObjectForbiddenResponse(response);
            }
          },
        },
        {
          testTitle:
            'copying with an inexact match conflict (a) - originId matches existing originId',
          objects: [{ type, id: inexactMatchIdA }],
          retries: createRetries({
            type,
            id: inexactMatchIdA,
            overwrite: true,
            destinationId: 'conflict_1a_space_2',
          }),
          statusCode,
          response: async (response: TestResponse) => {
            if (outcome === 'authorized') {
              expectSavedObjectSuccessResponse(response, inexactMatchIdA, 'conflict_1a_space_2');
            } else if (outcome === 'noAccess') {
              expectRouteForbiddenResponse(response);
            } else {
              // unauthorized read/write
              expectSavedObjectForbiddenResponse(response);
            }
          },
        },
        {
          testTitle: 'copying with an inexact match conflict (b) - originId matches existing id',
          objects: [{ type, id: inexactMatchIdB }],
          retries: createRetries({
            type,
            id: inexactMatchIdB,
            overwrite: true,
            destinationId: 'conflict_1b_space_2',
          }),
          statusCode,
          response: async (response: TestResponse) => {
            if (outcome === 'authorized') {
              expectSavedObjectSuccessResponse(response, inexactMatchIdB, 'conflict_1b_space_2');
            } else if (outcome === 'noAccess') {
              expectRouteForbiddenResponse(response);
            } else {
              // unauthorized read/write
              expectSavedObjectForbiddenResponse(response);
            }
          },
        },
        {
          testTitle: 'copying with an inexact match conflict (c) - id matches existing originId',
          objects: [{ type, id: inexactMatchIdC }],
          retries: createRetries({
            type,
            id: inexactMatchIdC,
            overwrite: true,
            destinationId: 'conflict_1c_space_2',
          }),
          statusCode,
          response: async (response: TestResponse) => {
            if (outcome === 'authorized') {
              expectSavedObjectSuccessResponse(response, inexactMatchIdC, 'conflict_1c_space_2');
            } else if (outcome === 'noAccess') {
              expectRouteForbiddenResponse(response);
            } else {
              // unauthorized read/write
              expectSavedObjectForbiddenResponse(response);
            }
          },
        },
        {
          testTitle: 'copying with an ambiguous conflict',
          objects: [{ type, id: ambiguousConflictId }],
          retries: createRetries({
            type,
            id: ambiguousConflictId,
            overwrite: true,
            destinationId: 'conflict_2_space_2',
          }),
          statusCode,
          response: async (response: TestResponse) => {
            if (outcome === 'authorized') {
              expectSavedObjectSuccessResponse(response, ambiguousConflictId, 'conflict_2_space_2');
            } else if (outcome === 'noAccess') {
              expectRouteForbiddenResponse(response);
            } else {
              // unauthorized read/write
              expectSavedObjectForbiddenResponse(response);
            }
          },
        },
      ];
    };

  const makeResolveCopyToSpaceConflictsTest =
    (describeFn: DescribeFn) =>
    (
      description: string,
      { user = {}, spaceId = DEFAULT_SPACE_ID, tests }: ResolveCopyToSpaceTestDefinition
    ) => {
      describeFn(description, () => {
        before(() => {
          // test data only allows for the following spaces as the copy origin
          expect(['default', 'space_1']).to.contain(spaceId);
        });

        describe('single-namespace types', () => {
          beforeEach(() =>
            esArchiver.load(
              'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
            )
          );
          afterEach(() =>
            esArchiver.unload(
              'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
            )
          );

          const dashboardObject = { type: 'dashboard', id: `cts_dashboard_${spaceId}` };
          const visualizationObject = { type: 'visualization', id: `cts_vis_3_${spaceId}` };
          const indexPatternObject = { type: 'index-pattern', id: `cts_ip_1_${spaceId}` };

          it(`should return ${tests.withReferencesNotOverwriting.statusCode} when not overwriting, with references`, async () => {
            const destination = getDestinationSpace(spaceId);

            return supertestWithoutAuth
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_resolve_copy_saved_objects_errors`)
              .auth(user.username, user.password)
              .send({
                objects: [dashboardObject],
                includeReferences: true,
                createNewCopies: false,
                retries: {
                  [destination]: [
                    {
                      ...indexPatternObject,
                      destinationId: `cts_ip_1_${destination}`,
                      overwrite: false,
                    },
                    {
                      ...visualizationObject,
                      destinationId: `cts_vis_3_${destination}`,
                      overwrite: false,
                    },
                  ],
                },
              })
              .expect(tests.withReferencesNotOverwriting.statusCode)
              .then(tests.withReferencesNotOverwriting.response);
          });

          it(`should return ${tests.withReferencesOverwriting.statusCode} when overwriting, with references`, async () => {
            const destination = getDestinationSpace(spaceId);

            return supertestWithoutAuth
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_resolve_copy_saved_objects_errors`)
              .auth(user.username, user.password)
              .send({
                objects: [dashboardObject],
                includeReferences: true,
                createNewCopies: false,
                retries: {
                  [destination]: [
                    {
                      ...indexPatternObject,
                      destinationId: `cts_ip_1_${destination}`,
                      overwrite: true,
                    },
                    {
                      ...visualizationObject,
                      destinationId: `cts_vis_3_${destination}`,
                      overwrite: true,
                    },
                  ],
                },
              })
              .expect(tests.withReferencesOverwriting.statusCode)
              .then(tests.withReferencesOverwriting.response);
          });

          it(`should return ${tests.withoutReferencesOverwriting.statusCode} when overwriting, without references`, async () => {
            const destination = getDestinationSpace(spaceId);

            return supertestWithoutAuth
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_resolve_copy_saved_objects_errors`)
              .auth(user.username, user.password)
              .send({
                objects: [dashboardObject],
                includeReferences: false,
                createNewCopies: false,
                retries: {
                  [destination]: [
                    {
                      ...dashboardObject,
                      destinationId: `cts_dashboard_${destination}`,
                      overwrite: true,
                    },
                  ],
                },
              })
              .expect(tests.withoutReferencesOverwriting.statusCode)
              .then(tests.withoutReferencesOverwriting.response);
          });

          it(`should return ${tests.withoutReferencesNotOverwriting.statusCode} when not overwriting, without references`, async () => {
            const destination = getDestinationSpace(spaceId);

            return supertestWithoutAuth
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_resolve_copy_saved_objects_errors`)
              .auth(user.username, user.password)
              .send({
                objects: [dashboardObject],
                includeReferences: false,
                createNewCopies: false,
                retries: {
                  [destination]: [
                    {
                      ...dashboardObject,
                      destinationId: `cts_dashboard_${destination}`,
                      overwrite: false,
                    },
                  ],
                },
              })
              .expect(tests.withoutReferencesNotOverwriting.statusCode)
              .then(tests.withoutReferencesNotOverwriting.response);
          });

          it(`should return ${tests.nonExistentSpace.statusCode} when resolving within a non-existent space`, async () => {
            const destination = NON_EXISTENT_SPACE_ID;

            return supertestWithoutAuth
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_resolve_copy_saved_objects_errors`)
              .auth(user.username, user.password)
              .send({
                objects: [dashboardObject],
                includeReferences: false,
                createNewCopies: false,
                retries: {
                  [destination]: [
                    {
                      ...dashboardObject,
                      destinationId: `cts_dashboard_${destination}`,
                      // realistically a retry wouldn't use a destinationId, because it wouldn't have an origin conflict with another
                      // object in a non-existent space, but for the simplicity of testing we'll use this here
                      overwrite: true,
                    },
                  ],
                },
              })
              .expect(tests.nonExistentSpace.statusCode)
              .then(tests.nonExistentSpace.response);
          });
        });

        const includeReferences = false;
        const createNewCopies = false;
        describe(`multi-namespace types with "overwrite" retry`, () => {
          before(() =>
            esArchiver.load(
              'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
            )
          );
          after(() =>
            esArchiver.unload(
              'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
            )
          );

          const testCases = tests.multiNamespaceTestCases();
          testCases.forEach(({ testTitle, objects, retries, statusCode, response }) => {
            it(`should return ${statusCode} when ${testTitle}`, async () => {
              return supertestWithoutAuth
                .post(`${getUrlPrefix(spaceId)}/api/spaces/_resolve_copy_saved_objects_errors`)
                .auth(user.username, user.password)
                .send({ objects, includeReferences, createNewCopies, retries })
                .expect(statusCode)
                .then(response);
            });
          });
        });
      });
    };

  const resolveCopyToSpaceConflictsTest = makeResolveCopyToSpaceConflictsTest(describe);
  // @ts-ignore
  resolveCopyToSpaceConflictsTest.only = makeResolveCopyToSpaceConflictsTest(describe.only);

  return {
    resolveCopyToSpaceConflictsTest,
    expectRouteForbiddenResponse,
    expectRouteNotFoundResponse,
    createExpectOverriddenResponseWithReferences,
    createExpectOverriddenResponseWithoutReferences,
    createExpectNonOverriddenResponseWithReferences,
    createExpectNonOverriddenResponseWithoutReferences,
    createExpectUnauthorizedAtSpaceWithReferencesResult,
    createExpectUnauthorizedAtSpaceWithoutReferencesResult,
    createMultiNamespaceTestCases,
    originSpaces: ['default', 'space_1'],
    NON_EXISTENT_SPACE_ID,
  };
}
