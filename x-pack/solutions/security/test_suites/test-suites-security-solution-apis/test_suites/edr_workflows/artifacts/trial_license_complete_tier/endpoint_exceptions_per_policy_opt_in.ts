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
  disablePerPolicyEndpointExceptions,
  findEndpointExceptionsPerPolicyOptInSO,
} from '@kbn/security-solution-plugin/scripts/endpoint/common/endpoint_artifact_services';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { ENDPOINT_EXCEPTIONS_LIST_DEFINITION } from '@kbn/security-solution-plugin/public/management/pages/endpoint_exceptions/constants';
import type { CustomRole } from '../../../../config/services/types';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function endpointExceptionsPerPolicyOptInTests({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const config = getService('config');
  const kibanaServer = getService('kibanaServer');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const retry = getService('retry');

  const isServerless = config.get('serverless');
  // In serverless, usernames of Cloud users are purely numeric.
  const username = isServerless ? '1954128031' : 'elastic';
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
      await disablePerPolicyEndpointExceptions(kibanaServer);
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
            it('should store the opt-in status, reason, user, and timestamp in reference data', async () => {
              const initialOptInStatusSO = await findEndpointExceptionsPerPolicyOptInSO(
                kibanaServer
              );
              expect(initialOptInStatusSO?.attributes.metadata.status).to.be(false);

              await superuser
                .post(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(200);

              const optInStatusSO = await findEndpointExceptionsPerPolicyOptInSO(kibanaServer);
              expect(optInStatusSO?.attributes.metadata.status).to.be(true);
              expect(optInStatusSO?.attributes.metadata.reason).to.be('userOptedIn');
              expect(optInStatusSO?.attributes.metadata.user).to.be(username);
              expect(optInStatusSO?.attributes.metadata.timestamp).to.be.a('string');

              const nowVsOptInTimestamp =
                new Date().getTime() -
                new Date(optInStatusSO?.attributes.metadata.timestamp ?? '').getTime();
              expect(Math.abs(nowVsOptInTimestamp)).to.be.lessThan(10_000);
            });

            it('should have an idempotent behavior', async () => {
              const initialOptInStatusSO = await findEndpointExceptionsPerPolicyOptInSO(
                kibanaServer
              );
              expect(initialOptInStatusSO?.attributes.metadata.status).to.be(false);

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
            it('should return `false` opt-in status for upgraded deployments', async () => {
              // Simulate upgraded deployment by ensuring the SO does not exist and creating
              // the Endpoint exceptions list as this is the base for deciding the default opt-in status
              await endpointArtifactTestResources.ensureListExists(
                ENDPOINT_EXCEPTIONS_LIST_DEFINITION,
                { supertest: superuser }
              );

              const response = await superuser
                .get(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(200);

              expect(response.body).to.eql({ status: false });
            });

            it('should return `true` opt-in status when it is a new deployment', async () => {
              // Simulate new deployment by deleting Endpoint exceptions list, and
              await endpointArtifactTestResources.deleteList(
                ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
              );
              // removing the opt-in status SO
              await deleteEndpointExceptionsPerPolicyOptInSO(kibanaServer);

              await retry.try(async () => {
                const optInStatusSO = await findEndpointExceptionsPerPolicyOptInSO(kibanaServer);
                expect(optInStatusSO).to.be(undefined);
              });

              const response = await superuser
                .get(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE)
                .set(HEADERS)
                .expect(200);

              expect(response.body).to.eql({ status: true, reason: 'newDeployment' });
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

              expect(response.body).to.eql({ status: true, reason: 'userOptedIn' });
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
