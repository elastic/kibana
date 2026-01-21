/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type TestAgent from 'supertest/lib/agent';
import expect from '@kbn/expect';
import { ENDPOINT_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { GLOBAL_ARTIFACT_TAG } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/constants';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';
import {
  buildPerPolicyTag,
  isPolicySelectionTag,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/utils';
import type { ArtifactTestData } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_artifacts';
import type { PolicyTestResourceInfo } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_policy';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const rolesUsersProvider = getService('rolesUsersProvider');
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const utils = getService('securitySolutionUtils');
  const config = getService('config');

  const IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED = (
    config.get('kbnTestServer.serverArgs', []) as string[]
  )
    .find((s) => s.startsWith('--xpack.securitySolution.enableExperimental'))
    ?.includes('endpointExceptionsMovedUnderManagement');

  // FLAKY: https://github.com/elastic/kibana/issues/247211
  describe.skip('@ess @serverless @skipInServerlessMKI Endpoint List API (deprecated): RBAC and Validation', function () {
    let fleetEndpointPolicy: PolicyTestResourceInfo;

    let t1AnalystSupertest: TestAgent;
    let endpointPolicyManagerSupertest: TestAgent;

    before(async () => {
      t1AnalystSupertest = await utils.createSuperTest(ROLE.t1_analyst);
      endpointPolicyManagerSupertest = await utils.createSuperTest(ROLE.endpoint_policy_manager);

      // Create an endpoint policy in fleet we can work with
      fleetEndpointPolicy = await endpointPolicyTestResources.createPolicy();
    });

    after(async () => {
      if (fleetEndpointPolicy) {
        await fleetEndpointPolicy.cleanup();
      }
    });

    const anEndpointArtifactError = (res: { body: { message: string } }) => {
      expect(res.body.message).to.match(/EndpointArtifactError/);
    };
    const anErrorMessageWith = (
      value: string | RegExp
    ): ((res: { body: { message: string } }) => void) => {
      return (res) => {
        if (value instanceof RegExp) {
          expect(res.body.message).to.match(value);
        } else {
          expect(res.body.message).to.be(value);
        }
      };
    };

    const exceptionsGenerator = new ExceptionsListItemGenerator();
    let endpointExceptionData: ArtifactTestData;

    type EndpointListApiCallsInterface<BodyReturnType = unknown> = Array<{
      method: keyof Pick<TestAgent, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
      info?: string;
      path: string;
      // The body just needs to have the properties we care about in the tests. This should cover most
      // mocks used for testing that support different interfaces
      getBody: () => BodyReturnType;
    }>;

    const endpointListCalls: EndpointListApiCallsInterface<
      Pick<ExceptionListItemSchema, 'item_id' | 'os_types' | 'tags' | 'entries'> & {
        id?: string;
        _version?: string;
      }
    > = [
      {
        method: 'post',
        info: 'create single item',
        path: ENDPOINT_LIST_ITEM_URL,
        getBody: () =>
          exceptionsGenerator.generateEndpointExceptionForCreate({
            tags: endpointExceptionData?.artifact.tags || [
              buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id),
            ],
          }),
      },
      {
        method: 'put',
        info: 'update single item',
        path: ENDPOINT_LIST_ITEM_URL,
        getBody: () =>
          exceptionsGenerator.generateEndpointExceptionForUpdate({
            id: endpointExceptionData.artifact.id,
            item_id: endpointExceptionData.artifact.item_id,
            tags: endpointExceptionData.artifact.tags,
            _version: endpointExceptionData.artifact._version,
          }),
      },
    ];

    const needsWritePrivilege: EndpointListApiCallsInterface = [
      {
        method: 'delete',
        info: 'delete single item',
        get path() {
          return `${ENDPOINT_LIST_ITEM_URL}?item_id=${endpointExceptionData.artifact.item_id}`;
        },
        getBody: () => undefined,
      },
    ];

    const needsReadPrivilege: EndpointListApiCallsInterface = [
      {
        method: 'get',
        info: 'single item',
        get path() {
          return `${ENDPOINT_LIST_ITEM_URL}?item_id=${endpointExceptionData.artifact.item_id}`;
        },
        getBody: () => undefined,
      },
      {
        method: 'get',
        info: 'find items',
        get path() {
          return `${ENDPOINT_LIST_ITEM_URL}/_find?page=1&per_page=1&sort_field=name&sort_order=asc`;
        },
        getBody: () => undefined,
      },
    ];

    beforeEach(async () => {
      endpointExceptionData = await endpointArtifactTestResources.createEndpointException({
        tags: [buildPerPolicyTag(fleetEndpointPolicy.packagePolicy.id)],
      });
    });

    afterEach(async () => {
      if (endpointExceptionData) {
        await endpointExceptionData.cleanup();
      }
    });

    describe('and has authorization to manage endpoint security', () => {
      for (const endpointListApiCall of endpointListCalls) {
        it(`should work on [${endpointListApiCall.method}] with valid entry`, async () => {
          const body = endpointListApiCall.getBody();

          // Using superuser here as we need custom license for this action
          await endpointPolicyManagerSupertest[endpointListApiCall.method](endpointListApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(200);

          const deleteUrl = `${ENDPOINT_LIST_ITEM_URL}?item_id=${body.item_id}`;
          await endpointPolicyManagerSupertest.delete(deleteUrl).set('kbn-xsrf', 'true');
        });

        it(`should work on [${endpointListApiCall.method}] if more than one OS is set`, async () => {
          const body = endpointListApiCall.getBody();
          body.os_types = ['linux', 'windows'];

          await endpointPolicyManagerSupertest[endpointListApiCall.method](endpointListApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(200);

          const deleteUrl = `${ENDPOINT_LIST_ITEM_URL}?item_id=${body.item_id}`;
          await endpointPolicyManagerSupertest.delete(deleteUrl).set('kbn-xsrf', 'true');
        });

        if (IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED) {
          it(`should accept item on [${endpointListApiCall.method}] if no assignment tag is present`, async () => {
            const requestBody = endpointListApiCall.getBody();
            requestBody.tags = [];

            await endpointPolicyManagerSupertest[endpointListApiCall.method](
              endpointListApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(requestBody)
              .expect(200)
              .expect(({ body }) => expect(body.tags).to.not.contain(GLOBAL_ARTIFACT_TAG));

            const deleteUrl = `${ENDPOINT_LIST_ITEM_URL}?item_id=${requestBody.item_id}`;
            await endpointPolicyManagerSupertest.delete(deleteUrl).set('kbn-xsrf', 'true');
          });
        } else {
          it(`should add global artifact tag on [${endpointListApiCall.method}] if no assignment tag is present`, async () => {
            const requestBody = endpointListApiCall.getBody();
            requestBody.tags = [];

            await endpointPolicyManagerSupertest[endpointListApiCall.method](
              endpointListApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(requestBody)
              .expect(200)
              .expect(({ body }) => expect(body.tags).to.contain(GLOBAL_ARTIFACT_TAG));

            const deleteUrl = `${ENDPOINT_LIST_ITEM_URL}?item_id=${requestBody.item_id}`;
            await endpointPolicyManagerSupertest.delete(deleteUrl).set('kbn-xsrf', 'true');
          });
        }

        if (IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED) {
          it(`should error on [${endpointListApiCall.method}] if policy id is invalid`, async () => {
            const body = endpointListApiCall.getBody();
            body.tags = [buildPerPolicyTag('123')];

            await endpointPolicyManagerSupertest[endpointListApiCall.method](
              endpointListApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid policy ids/));
          });
        }
      }
      for (const endpointListApiCall of [...needsWritePrivilege, ...needsReadPrivilege]) {
        it(`should not error on [${endpointListApiCall.method}] - [${endpointListApiCall.info}]`, async () => {
          await endpointPolicyManagerSupertest[endpointListApiCall.method](endpointListApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(endpointListApiCall.getBody() as object)
            .expect(200);
        });
      }
    });

    describe('@skipInServerless and user has endpoint exception access but no global artifact access', () => {
      let noGlobalArtifactSupertest: TestAgent;

      before(async () => {
        const loadedRole = await rolesUsersProvider.loader.create({
          name: 'no_global_artifact_role_endpoint_list',
          kibana: [
            {
              base: [],
              feature: {
                [SECURITY_FEATURE_ID]: ['read', 'endpoint_exceptions_all'],
              },
              spaces: ['*'],
            },
          ],
          elasticsearch: { cluster: [], indices: [], run_as: [] },
        });

        noGlobalArtifactSupertest = await utils.createSuperTest(loadedRole.username);
      });

      after(async () => {
        await rolesUsersProvider.loader.delete('no_global_artifact_role_endpoint_list');
      });

      for (const endpointListApiCall of endpointListCalls) {
        if (IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED) {
          it(`should error on [${endpointListApiCall.method}] - [${endpointListApiCall.info}] when global artifact is the target`, async () => {
            const requestBody = endpointListApiCall.getBody();
            // keep space tag, but replace any per-policy tags with a global tag
            requestBody.tags = [
              ...requestBody.tags.filter((tag) => !isPolicySelectionTag(tag)),
              GLOBAL_ARTIFACT_TAG,
            ];

            await noGlobalArtifactSupertest[endpointListApiCall.method](endpointListApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(requestBody as object)
              .expect(403)
              .expect(anEndpointArtifactError)
              .expect(
                anErrorMessageWith(
                  /Endpoint authorization failure. Management of global artifacts requires additional privilege \(global artifact management\)/
                )
              );
          });

          it(`should work on [${endpointListApiCall.method}] - [${endpointListApiCall.info}] when per-policy artifact is the target`, async () => {
            const requestBody = endpointListApiCall.getBody();

            // remove existing tag
            requestBody.tags = requestBody.tags.filter((tag) => !isPolicySelectionTag(tag));

            await noGlobalArtifactSupertest[endpointListApiCall.method](endpointListApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(requestBody as object)
              .expect(200);
          });
        } else {
          it(`should error on [${endpointListApiCall.method}] - [${endpointListApiCall.info}]`, async () => {
            await noGlobalArtifactSupertest[endpointListApiCall.method](endpointListApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(endpointListApiCall.getBody() as object)
              .expect(403)
              .expect(anEndpointArtifactError)
              .expect(
                anErrorMessageWith(
                  /Endpoint authorization failure. Management of global artifacts requires additional privilege \(global artifact management\)/
                )
              );
          });
        }
      }
    });

    describe('@skipInServerless and user has authorization to read endpoint exceptions', function () {
      let hunterSupertest: TestAgent;

      before(async () => {
        hunterSupertest = await utils.createSuperTest(ROLE.hunter);
      });

      for (const endpointListApiCall of [...endpointListCalls, ...needsWritePrivilege]) {
        it(`should error on [${endpointListApiCall.method}] - [${endpointListApiCall.info}]`, async () => {
          await hunterSupertest[endpointListApiCall.method](endpointListApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(endpointListApiCall.getBody() as object)
            .expect(403);
        });
      }

      for (const endpointListApiCall of needsReadPrivilege) {
        it(`should not error on [${endpointListApiCall.method}] - [${endpointListApiCall.info}]`, async () => {
          await hunterSupertest[endpointListApiCall.method](endpointListApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(endpointListApiCall.getBody() as object)
            .expect(200);
        });
      }
    });

    describe('and user has no authorization to endpoint exceptions', () => {
      for (const endpointListApiCall of [
        ...endpointListCalls,
        ...needsWritePrivilege,
        ...needsReadPrivilege,
      ]) {
        it(`should error on [${endpointListApiCall.method}] - [${endpointListApiCall.info}]`, async () => {
          await t1AnalystSupertest[endpointListApiCall.method](endpointListApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(endpointListApiCall.getBody() as object)
            .expect(403);
        });
      }
    });

    // @skipInServerless - waiting for https://github.com/elastic/kibana/pull/248962
    describe('@skipInServerless read-only user on non-existent list', () => {
      let readOnlyNoSoWriteSupertest: TestAgent;

      before(async () => {
        const loadedRole = await rolesUsersProvider.loader.create({
          name: 'endpoint_exceptions_read_no_so_write',
          kibana: [
            {
              base: [],
              feature: {
                [SECURITY_FEATURE_ID]: ['minimal_read', 'endpoint_exceptions_read'],
              },
              spaces: ['*'],
            },
          ],
          elasticsearch: { cluster: [], indices: [], run_as: [] },
        });

        readOnlyNoSoWriteSupertest = await utils.createSuperTest(loadedRole.username);
      });

      after(async () => {
        await rolesUsersProvider.loader.delete('endpoint_exceptions_read_no_so_write');
      });

      beforeEach(async () => {
        await endpointArtifactTestResources.deleteList(
          'endpoint_list',
          endpointPolicyManagerSupertest
        );
      });

      it('should return 404 when endpoint list does not exist', async () => {
        await readOnlyNoSoWriteSupertest
          .get(`${ENDPOINT_LIST_ITEM_URL}/_find?page=1&per_page=1&sort_field=name&sort_order=asc`)
          .set('kbn-xsrf', 'true')
          .expect(404);
      });
    });
  });
}
