/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      .get(`${getUrlPrefix(spaceId)}/api/saved_objects/visualization/cts_vis_3`)
      .then((response: any) => response.body);
  };
  const getDashboardAtSpace = async (spaceId: string): Promise<SavedObject<any>> => {
    return supertestWithAuth
      .get(`${getUrlPrefix(spaceId)}/api/saved_objects/dashboard/cts_dashboard`)
      .then((response: any) => response.body);
  };

  const getObjectsAtSpace = async (
    spaceId: string
  ): Promise<[SavedObject<any>, SavedObject<any>]> => {
    const dashboard = await getDashboardAtSpace(spaceId);
    const visualization = await getVisualizationAtSpace(spaceId);
    return [dashboard, visualization];
  };

  const createExpectOverriddenResponseWithReferences = (sourceSpaceId: string) => async (
    response: TestResponse
  ) => {
    const destination = getDestinationSpace(sourceSpaceId);
    const result = response.body;
    expect(result).to.eql({
      [destination]: {
        success: true,
        successCount: 1,
        successResults: [
          {
            id: 'cts_vis_3',
            type: 'visualization',
            meta: {
              title: `CTS vis 3 from ${sourceSpaceId} space`,
              icon: 'visualizeApp',
            },
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

  const createExpectOverriddenResponseWithoutReferences = (
    sourceSpaceId: string,
    destinationSpaceId: string = getDestinationSpace(sourceSpaceId)
  ) => async (response: TestResponse) => {
    const result = response.body;
    expect(result).to.eql({
      [destinationSpaceId]: {
        success: true,
        successCount: 1,
        successResults: [
          {
            id: 'cts_dashboard',
            type: 'dashboard',
            meta: {
              title: `This is the ${sourceSpaceId} test space CTS dashboard`,
              icon: 'dashboardApp',
            },
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

  const createExpectNonOverriddenResponseWithReferences = (sourceSpaceId: string) => async (
    response: TestResponse
  ) => {
    const destination = getDestinationSpace(sourceSpaceId);

    const result = response.body;
    expect(result).to.eql({
      [destination]: {
        success: false,
        successCount: 0,
        errors: [
          {
            error: { type: 'conflict' },
            id: 'cts_vis_3',
            title: `CTS vis 3 from ${sourceSpaceId} space`,
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

  const createExpectNonOverriddenResponseWithoutReferences = (sourceSpaceId: string) => async (
    response: TestResponse
  ) => {
    const destination = getDestinationSpace(sourceSpaceId);

    const result = response.body;
    expect(result).to.eql({
      [destination]: {
        success: false,
        successCount: 0,
        errors: [
          {
            error: { type: 'conflict' },
            id: 'cts_dashboard',
            type: 'dashboard',
            title: `This is the ${sourceSpaceId} test space CTS dashboard`,
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

  const expectNotFoundResponse = async (resp: TestResponse) => {
    expect(resp.body).to.eql({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found',
    });
  };

  const createExpectUnauthorizedAtSpaceWithReferencesResult = (
    spaceId: string = DEFAULT_SPACE_ID
  ) => async (resp: TestResponse) => {
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
            message: 'Unable to bulk_get index-pattern',
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

  const createExpectReadonlyAtSpaceWithReferencesResult = (
    spaceId: string = DEFAULT_SPACE_ID
  ) => async (resp: TestResponse) => {
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
            message: 'Unable to bulk_create visualization',
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

  const createExpectUnauthorizedAtSpaceWithoutReferencesResult = (
    sourceSpaceId: string = DEFAULT_SPACE_ID,
    destinationSpaceId: string = getDestinationSpace(sourceSpaceId)
  ) => async (resp: TestResponse) => {
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
  const createMultiNamespaceTestCases = (
    spaceId: string,
    outcome: 'authorized' | 'unauthorizedRead' | 'unauthorizedWrite' | 'noAccess' = 'authorized'
  ) => (): ResolveCopyToSpaceMultiNamespaceTest[] => {
    // the status code of the HTTP response differs depending on the error type
    // a 403 error actually comes back as an HTTP 200 response
    const statusCode = outcome === 'noAccess' ? 404 : 200;
    const type = 'sharedtype';
    const exactMatchId = 'all_spaces';
    const inexactMatchId = `conflict_1_${spaceId}`;
    const ambiguousConflictId = `conflict_2_${spaceId}`;

    const createRetries = (overwriteRetry: Record<string, any>) => ({ space_2: [overwriteRetry] });
    const getResult = (response: TestResponse) => (response.body as CopyResponse).space_2;
    const expectForbiddenResponse = (response: TestResponse) => {
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
    const expectSuccessResponse = (response: TestResponse, id: string, destinationId?: string) => {
      const { success, successCount, successResults, errors } = getResult(response);
      expect(success).to.eql(true);
      expect(successCount).to.eql(1);
      expect(errors).to.be(undefined);
      const title =
        id === exactMatchId
          ? 'A shared saved-object in the default, space_1, and space_2 spaces'
          : 'A shared saved-object in one space';
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
            expectSuccessResponse(response, exactMatchId);
          } else if (outcome === 'noAccess') {
            expectNotFoundResponse(response);
          } else {
            // unauthorized read/write
            expectForbiddenResponse(response);
          }
        },
      },
      {
        testTitle: 'copying with an inexact match conflict',
        objects: [{ type, id: inexactMatchId }],
        retries: createRetries({
          type,
          id: inexactMatchId,
          overwrite: true,
          destinationId: 'conflict_1_space_2',
        }),
        statusCode,
        response: async (response: TestResponse) => {
          if (outcome === 'authorized') {
            expectSuccessResponse(response, inexactMatchId, 'conflict_1_space_2');
          } else if (outcome === 'noAccess') {
            expectNotFoundResponse(response);
          } else {
            // unauthorized read/write
            expectForbiddenResponse(response);
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
            expectSuccessResponse(response, ambiguousConflictId, 'conflict_2_space_2');
          } else if (outcome === 'noAccess') {
            expectNotFoundResponse(response);
          } else {
            // unauthorized read/write
            expectForbiddenResponse(response);
          }
        },
      },
    ];
  };

  const makeResolveCopyToSpaceConflictsTest = (describeFn: DescribeFn) => (
    description: string,
    { user = {}, spaceId = DEFAULT_SPACE_ID, tests }: ResolveCopyToSpaceTestDefinition
  ) => {
    describeFn(description, () => {
      before(() => {
        // test data only allows for the following spaces as the copy origin
        expect(['default', 'space_1']).to.contain(spaceId);
      });

      describe('single-namespace types', () => {
        beforeEach(() => esArchiver.load('saved_objects/spaces'));
        afterEach(() => esArchiver.unload('saved_objects/spaces'));

        const dashboardObject = { type: 'dashboard', id: 'cts_dashboard' };
        const visualizationObject = { type: 'visualization', id: 'cts_vis_3' };

        it(`should return ${tests.withReferencesNotOverwriting.statusCode} when not overwriting, with references`, async () => {
          const destination = getDestinationSpace(spaceId);

          return supertestWithoutAuth
            .post(`${getUrlPrefix(spaceId)}/api/spaces/_resolve_copy_saved_objects_errors`)
            .auth(user.username, user.password)
            .send({
              objects: [dashboardObject],
              includeReferences: true,
              retries: { [destination]: [{ ...visualizationObject, overwrite: false }] },
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
              retries: { [destination]: [{ ...visualizationObject, overwrite: true }] },
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
              retries: { [destination]: [{ ...dashboardObject, overwrite: true }] },
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
              retries: { [destination]: [{ ...dashboardObject, overwrite: false }] },
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
              retries: { [destination]: [{ ...dashboardObject, overwrite: true }] },
            })
            .expect(tests.nonExistentSpace.statusCode)
            .then(tests.nonExistentSpace.response);
        });
      });

      const includeReferences = false;
      describe(`multi-namespace types with "overwrite" retry`, () => {
        before(() => esArchiver.load('saved_objects/spaces'));
        after(() => esArchiver.unload('saved_objects/spaces'));

        const testCases = tests.multiNamespaceTestCases();
        testCases.forEach(({ testTitle, objects, retries, statusCode, response }) => {
          it(`should return ${statusCode} when ${testTitle}`, async () => {
            return supertestWithoutAuth
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_resolve_copy_saved_objects_errors`)
              .auth(user.username, user.password)
              .send({ objects, includeReferences, retries })
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
    expectNotFoundResponse,
    createExpectOverriddenResponseWithReferences,
    createExpectOverriddenResponseWithoutReferences,
    createExpectNonOverriddenResponseWithReferences,
    createExpectNonOverriddenResponseWithoutReferences,
    createExpectUnauthorizedAtSpaceWithReferencesResult,
    createExpectReadonlyAtSpaceWithReferencesResult,
    createExpectUnauthorizedAtSpaceWithoutReferencesResult,
    createMultiNamespaceTestCases,
    originSpaces: ['default', 'space_1'],
    NON_EXISTENT_SPACE_ID,
  };
}
