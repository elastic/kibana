/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type TestAgent from 'supertest/lib/agent';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';
import { ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE } from '@kbn/security-solution-plugin/common/endpoint/constants';
import {
  deleteEndpointExceptionsPerPolicyOptInSO,
  findEndpointExceptionsPerPolicyOptInSO,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/per_policy_opt_in';
import type { CustomRole } from '../../../../config/services/types';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function endpointExceptionsPerPolicyOptInTests({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const config = getService('config');
  const kibanaServer = getService('kibanaServer');

  const isServerless = config.get('serverless');
  const superuserRole = isServerless ? 'admin' : 'elastic';

  const IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED = (
    config.get('kbnTestServer.serverArgs', []) as string[]
  )
    .find((s) => s.startsWith('--xpack.securitySolution.enableExperimental'))
    ?.includes('endpointExceptionsMovedUnderManagement');

  const HEADERS = {
    'x-elastic-internal-origin': 'kibana',
    'Elastic-Api-Version': '1',
    'kbn-xsrf': 'true',
  };

  describe('@ess @serverless @skipInServerlessMKI Endpoint Exceptions Per Policy Opt-In API', function () {
    beforeEach(async () => {
      await deleteEndpointExceptionsPerPolicyOptInSO(kibanaServer);
    });

    if (IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED) {
      describe('When Endpoint Exceptions moved FF is enabled', () => {
        let superuser: TestAgent;
        let endpointExceptionsAllUser: TestAgent;

        before(async () => {
          superuser = await utils.createSuperTest(superuserRole);

          endpointExceptionsAllUser = await utils.createSuperTestWithCustomRole(
            buildRole('endpointExceptionsAllUser', [
              'all',
              'endpoint_exceptions_all',
              'global_artifact_management_all',
            ])
          );
        });

        describe('POST /internal/api/endpoint/endpoint_exceptions_per_policy_opt_in', () => {
          describe('RBAC', () => {
            it('should respond 403 even with Endpoint Exceptions ALL privilege if user is not superuser', async () => {
              await endpointExceptionsAllUser
                .post(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(403);
            });

            it('should respond 200 with superuser', async () => {
              await superuser
                .post(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(200);
            });
          });

          describe('functionality', () => {
            it('should store the opt-in status in reference data', async () => {
              const initialOptInStatusSO = await findEndpointExceptionsPerPolicyOptInSO(
                kibanaServer
              );
              expect(initialOptInStatusSO).to.be(undefined);

              await superuser
                .post(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(200);

              const optInStatusSO = await findEndpointExceptionsPerPolicyOptInSO(kibanaServer);
              expect(optInStatusSO?.attributes.metadata.status).to.be(true);
            });

            it('should have an idempotent behavior', async () => {
              const initialOptInStatusSO = await findEndpointExceptionsPerPolicyOptInSO(
                kibanaServer
              );
              expect(initialOptInStatusSO).to.be(undefined);

              await superuser
                .post(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(200);
              await superuser
                .post(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(200);

              const optInStatusSO = await findEndpointExceptionsPerPolicyOptInSO(kibanaServer);
              expect(optInStatusSO?.attributes.metadata.status).to.be(true);
            });
          });
        });

        describe('GET /internal/api/endpoint/endpoint_exceptions_per_policy_opt_in', () => {
          describe('RBAC', () => {
            it('should respond 403 without Endpoint Exceptions READ privilege', async () => {
              const noEndpointExceptionsAccessUser = await utils.createSuperTestWithCustomRole(
                buildRole('endpointExceptionsAllUser', ['all', 'global_artifact_management_all'])
              );

              await noEndpointExceptionsAccessUser
                .get(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(403);
            });

            it('should respond 200 with Endpoint Exceptions READ privilege', async () => {
              const endpointExceptionsReadUser = await utils.createSuperTestWithCustomRole(
                buildRole('endpointExceptionsReadUser', ['all', 'endpoint_exceptions_read'])
              );
              await endpointExceptionsReadUser
                .get(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(200);
            });
          });

          describe('functionality', () => {
            it('should return `false` opt-in status when it has not been set', async () => {
              const response = await superuser
                .get(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(200);

              expect(response.body.status).to.be(false);
            });

            it('should return `true` opt-in status when it has been set', async () => {
              await superuser
                .post(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(200);

              const response = await superuser
                .get(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(200);

              expect(response.body.status).to.be(true);
            });
          });
        });
      });
    } else {
      describe('When Endpoint Exceptions moved FF is disabled', () => {
        describe('POST /internal/api/endpoint/endpoint_exceptions_per_policy_opt_in', () => {
          it('should respond 404', async () => {
            const superuser = await utils.createSuperTest(superuserRole);

            await superuser
              .post(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
              .set(HEADERS)
              .expect(404);
          });
        });

        describe('GET /internal/api/endpoint/endpoint_exceptions_per_policy_opt_in', () => {
          it('should respond 404', async () => {
            const superuser = await utils.createSuperTest(superuserRole);

            await superuser
              .get(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
              .set(HEADERS)
              .expect(404);
          });
        });
      });
    }
  });
}

const buildRole = (name: string, siemPrivileges: string[]): CustomRole => ({
  name,
  privileges: {
    kibana: [
      {
        base: [],
        feature: {
          [SECURITY_FEATURE_ID]: siemPrivileges,
        },
        spaces: ['*'],
      },
    ],
    elasticsearch: { cluster: [], indices: [] },
  },
});
