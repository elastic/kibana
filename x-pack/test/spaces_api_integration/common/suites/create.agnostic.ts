/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type {
  DeploymentAgnosticFtrProviderContext,
  SupertestWithRoleScopeType,
} from '../../deployment_agnostic/ftr_provider_context';
import { getTestScenariosForSpace } from '../lib/space_test_utils';
import type { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface CreateTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface CreateTests {
  newSpace: CreateTest;
  alreadyExists: CreateTest;
  reservedSpecified: CreateTest;
  solutionSpecified: CreateTest;
}

interface CreateTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId: string;
  tests: CreateTests;
}

export function createTestSuiteFactory({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const noop = () => undefined;

  const expectConflictResponse = (resp: { [key: string]: any }) => {
    expect(resp.body).to.only.have.keys(['error', 'message', 'statusCode']);
    expect(resp.body.error).to.equal('Conflict');
    expect(resp.body.statusCode).to.equal(409);
    expect(resp.body.message).to.match(new RegExp(`A space with the identifier .*`));
  };

  const expectNewSpaceResult = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      name: 'marketing',
      id: 'marketing',
      description: 'a description',
      color: '#5c5959',
      disabledFeatures: [],
    });
  };

  const expectRbacForbiddenResponse = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Unauthorized to create spaces',
    });
  };

  const expectReservedSpecifiedResult = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      name: 'reserved space',
      id: 'reserved',
      description: 'a description',
      color: '#5c5959',
      disabledFeatures: [],
    });
  };

  const expectSolutionSpecifiedResult = (resp: Record<string, any>) => {
    const disabledFeatures = resp.body.disabledFeatures.sort();

    const expected = {
      id: 'solution',
      name: 'space with solution',
      description: 'a description',
      color: '#5c5959',
      disabledFeatures: [
        // Disabled features are automatically added to the space when a solution is set
        'apm',
        'infrastructure',
        'inventory',
        'logs',
        'observabilityCases',
        'observabilityCasesV2',
        'observabilityCasesV3',
        'securitySolutionAssistant',
        'securitySolutionAttackDiscovery',
        'securitySolutionCases',
        'securitySolutionCasesV2',
        'securitySolutionCasesV3',
        'securitySolutionNotes',
        'securitySolutionSiemMigrations',
        'securitySolutionTimeline',
        'siem',
        'siemV2',
        'slo',
        'uptime',
      ],
      solution: 'es',
    };

    expect({ ...resp.body, disabledFeatures }).to.eql(expected);
  };

  const makeCreateTest =
    (describeFn: DescribeFn) =>
    (description: string, { user, spaceId, tests }: CreateTestDefinition) => {
      describeFn(description, () => {
        let supertest: SupertestWithRoleScopeType;

        before(async () => {
          supertest = await roleScopedSupertest.getSupertestWithRoleScope(user!);
        });

        after(async () => {
          await supertest.destroy();
        });

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

        getTestScenariosForSpace(spaceId).forEach(({ urlPrefix, scenario }) => {
          it(`should return ${tests.newSpace.statusCode} ${scenario}`, async () => {
            return supertest
              .post(`${urlPrefix}/api/spaces/space`)
              .send({
                name: 'marketing',
                id: 'marketing',
                description: 'a description',
                color: '#5c5959',
                disabledFeatures: [],
              })
              .expect(tests.newSpace.statusCode)
              .then(tests.newSpace.response);
          });

          describe('when it already exists', () => {
            it(`should return ${tests.alreadyExists.statusCode} ${scenario}`, async () => {
              return supertest
                .post(`${urlPrefix}/api/spaces/space`)
                .send({
                  name: 'space_1',
                  id: 'space_1',
                  color: '#ffffff',
                  description: 'a description',
                  disabledFeatures: [],
                })
                .expect(tests.alreadyExists.statusCode)
                .then(tests.alreadyExists.response);
            });
          });

          describe('when _reserved is specified', () => {
            it(`should return ${tests.reservedSpecified.statusCode} and ignore _reserved ${scenario}`, async () => {
              return supertest
                .post(`${urlPrefix}/api/spaces/space`)
                .send({
                  name: 'reserved space',
                  id: 'reserved',
                  description: 'a description',
                  color: '#5c5959',
                  _reserved: true,
                  disabledFeatures: [],
                })
                .expect(tests.reservedSpecified.statusCode)
                .then(tests.reservedSpecified.response);
            });
          });

          describe('when solution is specified', () => {
            it(`should return ${tests.solutionSpecified.statusCode}`, async () => {
              const statusCode = isServerless ? 400 : tests.solutionSpecified.statusCode;

              return supertest
                .post(`${urlPrefix}/api/spaces/space`)
                .send({
                  name: 'space with solution',
                  id: 'solution',
                  description: 'a description',
                  color: '#5c5959',
                  solution: 'es',
                  disabledFeatures: [],
                })
                .expect(statusCode)
                .then(isServerless ? noop : tests.solutionSpecified.response);
            });
          });
        });
      });
    };

  const createTest = makeCreateTest(describe);
  // @ts-ignore
  createTest.only = makeCreateTest(describe.only);

  return {
    createTest,
    expectConflictResponse,
    expectNewSpaceResult,
    expectRbacForbiddenResponse,
    expectReservedSpecifiedResult,
    expectSolutionSpecifiedResult,
  };
}
