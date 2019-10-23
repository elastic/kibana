/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { DEFAULT_SPACE_ID } from '../../../../legacy/plugins/spaces/common/constants';
import { getIdPrefix, getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface BulkCreateTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface BulkCreateCustomTest extends BulkCreateTest {
  description: string;
  requestBody: {
    [key: string]: any;
  };
}

interface BulkCreateTests {
  default: BulkCreateTest;
  includingSpace: BulkCreateTest;
  custom?: BulkCreateCustomTest;
}

interface BulkCreateTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  tests: BulkCreateTests;
}

const createBulkRequests = (spaceId: string) => [
  {
    type: 'visualization',
    id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
    attributes: {
      title: 'An existing visualization',
    },
  },
  {
    type: 'dashboard',
    id: `${getIdPrefix(spaceId)}a01b2f57-fcfd-4864-b735-09e28f0d815e`,
    attributes: {
      title: 'A great new dashboard',
    },
  },
  {
    type: 'globaltype',
    id: '05976c65-1145-4858-bbf0-d225cc78a06e',
    attributes: {
      name: 'A new globaltype object',
    },
  },
  {
    type: 'globaltype',
    id: '8121a00-8efd-21e7-1cb3-34ab966434445',
    attributes: {
      name: 'An existing globaltype',
    },
  },
];

const isGlobalType = (type: string) => type === 'globaltype';

export function bulkCreateTestSuiteFactory(es: any, esArchiver: any, supertest: SuperTest<any>) {
  const createExpectResults = (spaceId = DEFAULT_SPACE_ID) => async (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).to.eql({
      saved_objects: [
        {
          type: 'visualization',
          id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
          error: {
            message: 'version conflict, document already exists',
            statusCode: 409,
          },
        },
        {
          type: 'dashboard',
          id: `${getIdPrefix(spaceId)}a01b2f57-fcfd-4864-b735-09e28f0d815e`,
          updated_at: resp.body.saved_objects[1].updated_at,
          version: resp.body.saved_objects[1].version,
          attributes: {
            title: 'A great new dashboard',
          },
          references: [],
        },
        {
          type: 'globaltype',
          id: `05976c65-1145-4858-bbf0-d225cc78a06e`,
          updated_at: resp.body.saved_objects[2].updated_at,
          version: resp.body.saved_objects[2].version,
          attributes: {
            name: 'A new globaltype object',
          },
          references: [],
        },
        {
          type: 'globaltype',
          id: '8121a00-8efd-21e7-1cb3-34ab966434445',
          error: {
            message: 'version conflict, document already exists',
            statusCode: 409,
          },
        },
      ],
    });

    for (const savedObject of createBulkRequests(spaceId)) {
      const expectedSpacePrefix =
        spaceId === DEFAULT_SPACE_ID || isGlobalType(savedObject.type) ? '' : `${spaceId}:`;

      // query ES directory to ensure namespace was or wasn't specified
      const { _source } = await es.get({
        id: `${expectedSpacePrefix}${savedObject.type}:${savedObject.id}`,
        index: '.kibana',
      });

      const { namespace: actualNamespace } = _source;

      if (spaceId === DEFAULT_SPACE_ID || isGlobalType(savedObject.type)) {
        expect(actualNamespace).to.eql(undefined);
      } else {
        expect(actualNamespace).to.eql(spaceId);
      }
    }
  };

  const expectBadRequestForHiddenType = (resp: { [key: string]: any }) => {
    const spaceEntry = resp.body.saved_objects.find(
      (entry: any) => entry.id === 'my-hiddentype' && entry.type === 'hiddentype'
    );
    expect(spaceEntry).to.eql({
      id: 'my-hiddentype',
      type: 'hiddentype',
      error: {
        message: "Unsupported saved object type: 'hiddentype': Bad Request",
        statusCode: 400,
        error: 'Bad Request',
      },
    });
  };

  const expectedForbiddenTypes = ['dashboard', 'globaltype', 'visualization'];
  const expectedForbiddenTypesWithHiddenType = [
    'dashboard',
    'globaltype',
    'hiddentype',
    'visualization',
  ];
  const createExpectRbacForbidden = (types: string[] = expectedForbiddenTypes) => (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to bulk_create ${types.join(',')}`,
    });
  };

  const makeBulkCreateTest = (describeFn: DescribeFn) => (
    description: string,
    definition: BulkCreateTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.default.statusCode}`, async () => {
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_bulk_create`)
          .auth(user.username, user.password)
          .send(createBulkRequests(spaceId))
          .expect(tests.default.statusCode)
          .then(tests.default.response);
      });

      it(`including a hiddentype saved object should return ${tests.includingSpace.statusCode}`, async () => {
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_bulk_create`)
          .auth(user.username, user.password)
          .send(
            createBulkRequests(spaceId).concat([
              {
                type: 'hiddentype',
                id: `my-hiddentype`,
                attributes: {
                  name: 'My awesome hiddentype',
                },
              },
            ])
          )
          .expect(tests.includingSpace.statusCode)
          .then(tests.includingSpace.response);
      });

      if (tests.custom) {
        it(tests.custom!.description, async () => {
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_bulk_create`)
            .auth(user.username, user.password)
            .send(tests.custom!.requestBody)
            .expect(tests.custom!.statusCode)
            .then(tests.custom!.response);
        });
      }
    });
  };

  const bulkCreateTest = makeBulkCreateTest(describe);
  // @ts-ignore
  bulkCreateTest.only = makeBulkCreateTest(describe.only);

  return {
    bulkCreateTest,
    createExpectResults,
    createExpectRbacForbidden,
    expectBadRequestForHiddenType,
    expectedForbiddenTypesWithHiddenType,
  };
}
