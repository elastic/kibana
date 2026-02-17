/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type TestAgent from 'supertest/lib/agent';
import expect from '@kbn/expect';
import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
} from '@kbn/securitysolution-list-constants';
import {
  ALL_ENDPOINT_ARTIFACT_LIST_IDS,
  GLOBAL_ARTIFACT_TAG,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/constants';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';
import {
  buildPerPolicyTag,
  isPolicySelectionTag,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts/utils';
import type { ArtifactTestData } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_artifacts';
import type { PolicyTestResourceInfo } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_policy';
import { getHunter } from '@kbn/security-solution-plugin/scripts/endpoint/common/roles_users';
import type { CustomRole } from '../../../../config/services/types';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';
import { createSupertestErrorLogger } from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const utils = getService('securitySolutionUtils');
  const log = getService('log');
  const config = getService('config');

  const IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED = (
    config.get('kbnTestServer.serverArgs', []) as string[]
  )
    .find((s) => s.startsWith('--xpack.securitySolution.enableExperimental'))
    ?.includes('endpointExceptionsMovedUnderManagement');

  // @skipInServerlessMKI due to authentication issues - we should migrate from Basic to Bearer token when available
  // @skipInServerlessMKI - if you are removing this annotation, make sure to add the test suite to the MKI pipeline in .buildkite/pipelines/security_solution_quality_gate/mki_periodic/mki_periodic_defend_workflows.yml
  describe('@ess @serverless @skipInServerlessMKI Endpoint artifacts (via lists plugin): Endpoint Exceptions', function () {
    let fleetEndpointPolicy: PolicyTestResourceInfo;

    let t1AnalystSupertest: TestAgent;
    let endpointPolicyManagerSupertest: TestAgent;
    let endpointOpsAnalystSupertest: TestAgent;

    before(async () => {
      t1AnalystSupertest = await utils.createSuperTest(ROLE.t1_analyst);
      endpointPolicyManagerSupertest = await utils.createSuperTest(ROLE.endpoint_policy_manager);
      endpointOpsAnalystSupertest = await utils.createSuperTest(ROLE.endpoint_operations_analyst);

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

    type EndpointExceptionApiCallsInterface<BodyReturnType = unknown> = Array<{
      method: keyof Pick<TestAgent, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
      info?: string;
      path: string;
      // The body just needs to have the properties we care about in the tests. This should cover most
      // mocks used for testing that support different interfaces
      getBody: () => BodyReturnType;
    }>;

    const endpointExceptionCalls: EndpointExceptionApiCallsInterface<
      Pick<ExceptionListItemSchema, 'item_id' | 'namespace_type' | 'os_types' | 'tags' | 'entries'>
    > = [
      {
        method: 'post',
        info: 'create single item',
        path: EXCEPTION_LIST_ITEM_URL,
        getBody: () =>
          exceptionsGenerator.generateEndpointExceptionForCreate({
            tags: endpointExceptionData.artifact.tags,
          }),
      },
      {
        method: 'put',
        info: 'update single item',
        path: EXCEPTION_LIST_ITEM_URL,
        getBody: () =>
          exceptionsGenerator.generateEndpointExceptionForUpdate({
            id: endpointExceptionData.artifact.id,
            item_id: endpointExceptionData.artifact.item_id,
            tags: endpointExceptionData.artifact.tags,
            _version: endpointExceptionData.artifact._version,
          }),
      },
    ];

    const needsWritePrivilege: EndpointExceptionApiCallsInterface = [
      {
        method: 'delete',
        info: 'delete single item',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}?item_id=${endpointExceptionData.artifact.item_id}&namespace_type=${endpointExceptionData.artifact.namespace_type}`;
        },
        getBody: () => undefined,
      },
    ];

    const needsReadPrivilege: EndpointExceptionApiCallsInterface = [
      {
        method: 'get',
        info: 'single item',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}?item_id=${endpointExceptionData.artifact.item_id}&namespace_type=${endpointExceptionData.artifact.namespace_type}`;
        },
        getBody: () => undefined,
      },
      {
        method: 'get',
        info: 'list summary',
        get path() {
          return `${EXCEPTION_LIST_URL}/summary?list_id=${endpointExceptionData.artifact.list_id}&namespace_type=${endpointExceptionData.artifact.namespace_type}`;
        },
        getBody: () => undefined,
      },
      {
        method: 'get',
        info: 'find items',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${endpointExceptionData.artifact.list_id}&namespace_type=${endpointExceptionData.artifact.namespace_type}&page=1&per_page=1&sort_field=name&sort_order=asc`;
        },
        getBody: () => undefined,
      },
      {
        method: 'post',
        info: 'list export',
        get path() {
          return `${EXCEPTION_LIST_URL}/_export?list_id=${endpointExceptionData.artifact.list_id}&namespace_type=${endpointExceptionData.artifact.namespace_type}&id=${endpointExceptionData.artifact.id}&include_expired_exceptions=true`;
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

    after(async () => {
      const promises = ALL_ENDPOINT_ARTIFACT_LIST_IDS.map((listId) =>
        endpointArtifactTestResources.deleteList(listId)
      );
      await Promise.all(promises);
    });

    describe(`and using Import API`, function () {
      const buildImportBuffer = (
        listId: (typeof ALL_ENDPOINT_ARTIFACT_LIST_IDS)[number]
      ): Buffer => {
        const generator = new ExceptionsListItemGenerator();
        const listInfo = Object.values(ENDPOINT_ARTIFACT_LISTS).find((listDefinition) => {
          return listDefinition.id === listId;
        });

        if (!listInfo) {
          throw new Error(`Unknown listId: ${listId}. Unable to generate exception list item.`);
        }

        const createItem = () => {
          switch (listId) {
            case ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id:
              return generator.generateEndpointException();

            case ENDPOINT_ARTIFACT_LISTS.blocklists.id:
              return generator.generateBlocklist();

            case ENDPOINT_ARTIFACT_LISTS.eventFilters.id:
              return generator.generateEventFilter();

            case ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id:
              return generator.generateHostIsolationException();

            case ENDPOINT_ARTIFACT_LISTS.trustedApps.id:
              return generator.generateTrustedApp();

            case ENDPOINT_ARTIFACT_LISTS.trustedDevices.id:
              return generator.generateTrustedDevice();

            default:
              throw new Error(`Unknown listId: ${listId}. Unable to generate exception list item.`);
          }
        };

        return Buffer.from(
          `
  {"_version":"WzEsMV0=","created_at":"2025-08-21T14:20:07.012Z","created_by":"kibana","description":"${
    listInfo!.description
  }","id":"${listId}","immutable":false,"list_id":"${listId}","name":"${
            listInfo!.name
          }","namespace_type":"agnostic","os_types":[],"tags":[],"tie_breaker_id":"034d07f4-fa33-43bb-adfa-6f6bda7921ce","type":"endpoint","updated_at":"2025-08-21T14:20:07.012Z","updated_by":"kibana","version":1}
  ${JSON.stringify(createItem())}
  ${JSON.stringify(createItem())}
  ${JSON.stringify(createItem())}
  {"exported_exception_list_count":1,"exported_exception_list_item_count":3,"missing_exception_list_item_count":0,"missing_exception_list_items":[],"missing_exception_lists":[],"missing_exception_lists_count":0}
  `,
          'utf8'
        );
      };

      // All non-Endpoint exceptions artifacts are not allowed to import
      ALL_ENDPOINT_ARTIFACT_LIST_IDS.filter(
        (listId) => listId !== ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
      ).forEach((listId) => {
        it(`should error when importing ${listId} artifacts`, async () => {
          await endpointArtifactTestResources.deleteList(listId);

          const { body } = await endpointOpsAnalystSupertest
            .post(`${EXCEPTION_LIST_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .on('error', createSupertestErrorLogger(log).ignoreCodes([400]))
            .attach('file', buildImportBuffer(listId), 'import_data.ndjson')
            .expect(400);

          expect(body.message).to.eql(
            'EndpointArtifactError: Import is not supported for Endpoint artifact exceptions'
          );
        });
      });

      it('should import endpoint exceptions and add global artifact tag if missing', async () => {
        await endpointArtifactTestResources.deleteList(
          ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
        );

        await endpointOpsAnalystSupertest
          .post(`${EXCEPTION_LIST_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .attach(
            'file',
            buildImportBuffer(ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id),
            'import_exceptions.ndjson'
          )
          .expect(200);

        const { body } = await endpointOpsAnalystSupertest
          .get(`${EXCEPTION_LIST_ITEM_URL}/_find`)
          .set('kbn-xsrf', 'true')
          .on('error', createSupertestErrorLogger(log))
          .query({
            list_id: 'endpoint_list',
            namespace_type: 'agnostic',
            per_page: 50,
          })
          .send()
          .expect(200);

        // After import - all items should be returned on a GET `find` request.
        expect(body.data.length).to.eql(3);

        for (const endpointException of body.data) {
          expect(endpointException.tags).to.include.string(GLOBAL_ARTIFACT_TAG);

          const deleteUrl = `${EXCEPTION_LIST_ITEM_URL}?item_id=${endpointException.item_id}&namespace_type=${endpointException.namespace_type}`;
          await endpointOpsAnalystSupertest.delete(deleteUrl).set('kbn-xsrf', 'true');
        }
      });
    });

    describe('and has authorization to manage endpoint security', () => {
      for (const endpointExceptionApiCall of endpointExceptionCalls) {
        it(`should work on [${endpointExceptionApiCall.method}] with valid entry`, async () => {
          const body = endpointExceptionApiCall.getBody();

          // Using superuser here as we need custom license for this action
          await endpointPolicyManagerSupertest[endpointExceptionApiCall.method](
            endpointExceptionApiCall.path
          )
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(200);

          const deleteUrl = `${EXCEPTION_LIST_ITEM_URL}?item_id=${body.item_id}&namespace_type=${body.namespace_type}`;
          await endpointPolicyManagerSupertest.delete(deleteUrl).set('kbn-xsrf', 'true');
        });

        it(`should work on [${endpointExceptionApiCall.method}] if more than one OS is set`, async () => {
          const body = endpointExceptionApiCall.getBody();
          body.os_types = ['linux', 'windows'];

          await endpointPolicyManagerSupertest[endpointExceptionApiCall.method](
            endpointExceptionApiCall.path
          )
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(200);

          const deleteUrl = `${EXCEPTION_LIST_ITEM_URL}?item_id=${body.item_id}&namespace_type=${body.namespace_type}`;
          await endpointPolicyManagerSupertest.delete(deleteUrl).set('kbn-xsrf', 'true');
        });

        if (IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED) {
          it(`should accept item on [${endpointExceptionApiCall.method}] if no assignment tag is present`, async () => {
            const requestBody = endpointExceptionApiCall.getBody();
            requestBody.tags = [];

            await endpointPolicyManagerSupertest[endpointExceptionApiCall.method](
              endpointExceptionApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(requestBody)
              .expect(200)
              .expect(({ body }) => expect(body.tags).to.not.contain(GLOBAL_ARTIFACT_TAG));

            const deleteUrl = `${EXCEPTION_LIST_ITEM_URL}?item_id=${requestBody.item_id}&namespace_type=${requestBody.namespace_type}`;
            await endpointPolicyManagerSupertest.delete(deleteUrl).set('kbn-xsrf', 'true');
          });
        } else {
          it(`should add global artifact tag on [${endpointExceptionApiCall.method}] if no assignment tag is present`, async () => {
            const requestBody = endpointExceptionApiCall.getBody();
            requestBody.tags = [];

            await endpointPolicyManagerSupertest[endpointExceptionApiCall.method](
              endpointExceptionApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(requestBody)
              .expect(200)
              .expect(({ body }) => expect(body.tags).to.contain(GLOBAL_ARTIFACT_TAG));

            const deleteUrl = `${EXCEPTION_LIST_ITEM_URL}?item_id=${requestBody.item_id}&namespace_type=${requestBody.namespace_type}`;
            await endpointPolicyManagerSupertest.delete(deleteUrl).set('kbn-xsrf', 'true');
          });
        }

        if (IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED) {
          it(`should error on [${endpointExceptionApiCall.method}] if policy id is invalid`, async () => {
            const body = endpointExceptionApiCall.getBody();
            body.tags = [buildPerPolicyTag('123')];

            await endpointPolicyManagerSupertest[endpointExceptionApiCall.method](
              endpointExceptionApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid policy ids/));
          });
        }
      }
      for (const endpointExceptionApiCall of [...needsWritePrivilege, ...needsReadPrivilege]) {
        it(`should not error on [${endpointExceptionApiCall.method}] - [${endpointExceptionApiCall.info}]`, async () => {
          await endpointPolicyManagerSupertest[endpointExceptionApiCall.method](
            endpointExceptionApiCall.path
          )
            .set('kbn-xsrf', 'true')
            .send(endpointExceptionApiCall.getBody() as object)
            .expect(200);
        });
      }
    });

    describe('and user has endpoint exception access but no global artifact access', () => {
      let noGlobalArtifactSupertest: TestAgent;

      before(async () => {
        const role: CustomRole = {
          name: 'no_global_artifact_role',
          privileges: {
            kibana: [
              {
                base: [],
                feature: {
                  [SECURITY_FEATURE_ID]: ['read', 'endpoint_exceptions_all'],
                },
                spaces: ['*'],
              },
            ],
            elasticsearch: { cluster: [], indices: [] },
          },
        };

        noGlobalArtifactSupertest = await utils.createSuperTestWithCustomRole(role);
      });

      after(async () => {
        await utils.cleanUpCustomRoles();
      });

      for (const endpointExceptionApiCall of endpointExceptionCalls) {
        if (IS_ENDPOINT_EXCEPTION_MOVE_FF_ENABLED) {
          it(`should error on [${endpointExceptionApiCall.method}] - [${endpointExceptionApiCall.info}] when global artifact is the target`, async () => {
            const requestBody = endpointExceptionApiCall.getBody();
            // keep space tag, but replace any per-policy tags with a global tag
            requestBody.tags = [
              ...requestBody.tags.filter((tag) => !isPolicySelectionTag(tag)),
              GLOBAL_ARTIFACT_TAG,
            ];

            await noGlobalArtifactSupertest[endpointExceptionApiCall.method](
              endpointExceptionApiCall.path
            )
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

          it(`should work on [${endpointExceptionApiCall.method}] - [${endpointExceptionApiCall.info}] when per-policy artifact is the target`, async () => {
            const requestBody = endpointExceptionApiCall.getBody();

            // remove existing tag
            requestBody.tags = requestBody.tags.filter((tag) => !isPolicySelectionTag(tag));

            await noGlobalArtifactSupertest[endpointExceptionApiCall.method](
              endpointExceptionApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(requestBody as object)
              .expect(200);
          });
        } else {
          it(`should error on [${endpointExceptionApiCall.method}] - [${endpointExceptionApiCall.info}]`, async () => {
            await noGlobalArtifactSupertest[endpointExceptionApiCall.method](
              endpointExceptionApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(endpointExceptionApiCall.getBody() as object)
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

    describe('and user has authorization to read endpoint exceptions', function () {
      let hunterSupertest: TestAgent;

      before(async () => {
        hunterSupertest = await utils.createSuperTestWithCustomRole({
          name: 'custom_hunter_role',
          privileges: getHunter(),
        });
      });
      after(async () => {
        await utils.cleanUpCustomRoles();
      });

      for (const endpointExceptionApiCall of [...endpointExceptionCalls, ...needsWritePrivilege]) {
        it(`should error on [${endpointExceptionApiCall.method}] - [${endpointExceptionApiCall.info}]`, async () => {
          await hunterSupertest[endpointExceptionApiCall.method](endpointExceptionApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(endpointExceptionApiCall.getBody() as object)
            .expect(403);
        });
      }

      for (const endpointExceptionApiCall of needsReadPrivilege) {
        it(`should not error on [${endpointExceptionApiCall.method}] - [${endpointExceptionApiCall.info}]`, async () => {
          await hunterSupertest[endpointExceptionApiCall.method](endpointExceptionApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(endpointExceptionApiCall.getBody() as object)
            .expect(200);
        });
      }
    });

    describe('and user has no authorization to endpoint exceptions', () => {
      for (const endpointExceptionApiCall of [
        ...endpointExceptionCalls,
        ...needsWritePrivilege,
        ...needsReadPrivilege,
      ]) {
        it(`should error on [${endpointExceptionApiCall.method}] - [${endpointExceptionApiCall.info}]`, async () => {
          await t1AnalystSupertest[endpointExceptionApiCall.method](endpointExceptionApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(endpointExceptionApiCall.getBody() as object)
            .expect(403);
        });
      }
    });
  });
}
