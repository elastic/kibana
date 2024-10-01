/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { getTestScenariosForSpace } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface GetAllTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface GetAllTests {
  exists: GetAllTest;
  copySavedObjectsPurpose: GetAllTest;
  shareSavedObjectsPurpose: GetAllTest;
  includeAuthorizedPurposes: GetAllTest;
}

interface GetAllTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId: string;
  tests: GetAllTests;
}

interface AuthorizedPurposes {
  any: boolean;
  copySavedObjectsIntoSpace: boolean;
  findSavedObjects: boolean;
  shareSavedObjectsIntoSpace: boolean;
}

interface Space {
  id: string;
  name: string;
  description: string;
  solution?: string;
  disabledFeatures: string[];
}

const ALL_SPACE_RESULTS: Space[] = [
  {
    id: 'default',
    name: 'Default',
    color: '#00bfb3',
    description: 'This is your default space!',
    _reserved: true,
    disabledFeatures: [],
  },
  {
    id: 'space_1',
    name: 'Space 1',
    description: 'This is the first test space',
    disabledFeatures: [],
  },
  {
    id: 'space_2',
    name: 'Space 2',
    description: 'This is the second test space',
    disabledFeatures: [],
  },
  {
    id: 'space_3',
    name: 'Space 3',
    description: 'This is the third test space',
    solution: 'es',
    disabledFeatures: [
      // Disabled features are automatically added to the space when a solution is set
      'apm',
      'infrastructure',
      'logs',
      'observabilityAIAssistant',
      'observabilityCases',
      'securitySolutionAssistant',
      'securitySolutionAttackDiscovery',
      'securitySolutionCases',
      'siem',
      'slo',
      'uptime',
    ],
  },
];

const sortDisabledFeatures = (space: Space) => {
  return {
    ...space,
    disabledFeatures: space.disabledFeatures.sort(),
  };
};

const getAllSpacesResults = (license: 'basic' | 'trial' = 'basic') => {
  const copySpacesResults: Space[] = [...ALL_SPACE_RESULTS];

  if (license === 'trial') {
    // In trial, "inventory" is also disabled
    const index = copySpacesResults.findIndex((space) => space.id === 'space_3');
    let space3: Space | undefined = copySpacesResults.find((space) => space.id === 'space_3');

    if (space3) {
      const updatedDisabledFeatures: string[] = [...space3.disabledFeatures, 'inventory'];
      space3 = { ...space3, disabledFeatures: updatedDisabledFeatures };
      copySpacesResults.splice(index, 1, space3);
    }
  }

  return copySpacesResults.map(sortDisabledFeatures);
};

export function getAllTestSuiteFactory(
  esArchiver: any,
  supertest: SuperTest<any>,
  license: 'basic' | 'trial' = 'basic'
) {
  const createExpectResults =
    (...spaceIds: string[]) =>
    (resp: { [key: string]: any }) => {
      const expectedBody = getAllSpacesResults(license).filter((entry) =>
        spaceIds.includes(entry.id)
      );
      expect(resp.body.map(sortDisabledFeatures)).to.eql(expectedBody.map(sortDisabledFeatures));
    };

  const createExpectAllPurposesResults =
    (authorizedPurposes: AuthorizedPurposes, ...spaceIds: string[]) =>
    (resp: { [key: string]: any }) => {
      const expectedBody = getAllSpacesResults(license)
        .filter((entry) => spaceIds.includes(entry.id))
        .map((x) => ({ ...x, authorizedPurposes }));
      expect(resp.body.map(sortDisabledFeatures)).to.eql(expectedBody.map(sortDisabledFeatures));
    };

  const expectEmptyResult = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql('');
  };

  const expectRbacForbidden = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Forbidden',
      message: 'Forbidden',
      statusCode: 403,
    });
  };

  const makeGetAllTest =
    (describeFn: DescribeFn) =>
    (description: string, { user = {}, spaceId, tests }: GetAllTestDefinition) => {
      describeFn(description, () => {
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

        getTestScenariosForSpace(spaceId).forEach(({ scenario, urlPrefix }) => {
          describe('undefined purpose', () => {
            it(`should return ${tests.exists.statusCode} ${scenario}`, async () => {
              return supertest
                .get(`${urlPrefix}/api/spaces/space`)
                .auth(user.username, user.password)
                .expect(tests.exists.statusCode)
                .then(tests.exists.response);
            });
          });

          describe('copySavedObjectsIntoSpace purpose', () => {
            it(`should return ${tests.copySavedObjectsPurpose.statusCode} ${scenario}`, async () => {
              return supertest
                .get(`${urlPrefix}/api/spaces/space`)
                .query({ purpose: 'copySavedObjectsIntoSpace' })
                .auth(user.username, user.password)
                .expect(tests.copySavedObjectsPurpose.statusCode)
                .then(tests.copySavedObjectsPurpose.response);
            });
          });

          describe('shareSavedObjectsIntoSpace purpose', () => {
            it(`should return ${tests.shareSavedObjectsPurpose.statusCode} ${scenario}`, async () => {
              return supertest
                .get(`${urlPrefix}/api/spaces/space`)
                .query({ purpose: 'shareSavedObjectsIntoSpace' })
                .auth(user.username, user.password)
                .expect(tests.copySavedObjectsPurpose.statusCode)
                .then(tests.copySavedObjectsPurpose.response);
            });
          });

          describe('include_authorized_purposes=true', () => {
            it(`should return ${tests.includeAuthorizedPurposes.statusCode} ${scenario}`, async () => {
              return supertest
                .get(`${urlPrefix}/api/spaces/space`)
                .query({ include_authorized_purposes: true })
                .auth(user.username, user.password)
                .expect(tests.includeAuthorizedPurposes.statusCode)
                .then(tests.includeAuthorizedPurposes.response);
            });
          });
        });
      });
    };

  const getAllTest = makeGetAllTest(describe);
  // @ts-ignore
  getAllTest.only = makeGetAllTest(describe.only);

  return {
    createExpectResults,
    createExpectAllPurposesResults,
    expectRbacForbidden,
    getAllTest,
    expectEmptyResult,
  };
}
