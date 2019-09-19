/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { EsArchiver } from 'src/es_archiver';
import { SavedObject } from 'src/core/server';
import { DEFAULT_SPACE_ID } from '../../../../legacy/plugins/spaces/common/constants';
import { CopyResponse } from '../../../../plugins/spaces/server/lib/copy_to_spaces';
import { getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

type TestResponse = Record<string, any>;

interface ResolveCopyToSpaceTest {
  statusCode: number;
  response: (resp: TestResponse) => Promise<void>;
}

interface ResolveCopyToSpaceTests {
  withReferencesNotOverwriting: ResolveCopyToSpaceTest;
  withReferencesOverwriting: ResolveCopyToSpaceTest;
  withoutReferencesOverwriting: ResolveCopyToSpaceTest;
  withoutReferencesNotOverwriting: ResolveCopyToSpaceTest;
  nonExistentSpace: ResolveCopyToSpaceTest;
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

  const getObjectsAtSpace = async (spaceId: string): Promise<[SavedObject, SavedObject]> => {
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
            error: {
              type: 'conflict',
            },
            id: 'cts_vis_3',
            title: `CTS vis 3 from ${sourceSpaceId} space`,
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
            error: {
              type: 'conflict',
            },
            id: 'cts_dashboard',
            title: `This is the ${sourceSpaceId} test space CTS dashboard`,
            type: 'dashboard',
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

  const makeResolveCopyToSpaceConflictsTest = (describeFn: DescribeFn) => (
    description: string,
    { user = {}, spaceId = DEFAULT_SPACE_ID, tests }: ResolveCopyToSpaceTestDefinition
  ) => {
    describeFn(description, () => {
      before(() => {
        // test data only allows for the following spaces as the copy origin
        expect(['default', 'space_1']).to.contain(spaceId);
      });

      beforeEach(() => esArchiver.load('saved_objects/spaces'));
      afterEach(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.withReferencesNotOverwriting.statusCode} when not overwriting, with references`, async () => {
        const destination = getDestinationSpace(spaceId);

        return supertestWithoutAuth
          .post(`${getUrlPrefix(spaceId)}/api/spaces/_resolve_copy_saved_objects_errors`)
          .auth(user.username, user.password)
          .send({
            objects: [
              {
                type: 'dashboard',
                id: 'cts_dashboard',
              },
            ],
            includeReferences: true,
            retries: {
              [destination]: [
                {
                  type: 'visualization',
                  id: 'cts_vis_3',
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
            objects: [
              {
                type: 'dashboard',
                id: 'cts_dashboard',
              },
            ],
            includeReferences: true,
            retries: {
              [destination]: [
                {
                  type: 'visualization',
                  id: 'cts_vis_3',
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
            objects: [
              {
                type: 'dashboard',
                id: 'cts_dashboard',
              },
            ],
            includeReferences: false,
            retries: {
              [destination]: [
                {
                  type: 'dashboard',
                  id: 'cts_dashboard',
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
            objects: [
              {
                type: 'dashboard',
                id: 'cts_dashboard',
              },
            ],
            includeReferences: false,
            retries: {
              [destination]: [
                {
                  type: 'dashboard',
                  id: 'cts_dashboard',
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
            objects: [
              {
                type: 'dashboard',
                id: 'cts_dashboard',
              },
            ],
            includeReferences: false,
            retries: {
              [destination]: [
                {
                  type: 'dashboard',
                  id: 'cts_dashboard',
                  overwrite: true,
                },
              ],
            },
          })
          .expect(tests.nonExistentSpace.statusCode)
          .then(tests.nonExistentSpace.response);
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
    originSpaces: ['default', 'space_1'],
    NON_EXISTENT_SPACE_ID,
  };
}
