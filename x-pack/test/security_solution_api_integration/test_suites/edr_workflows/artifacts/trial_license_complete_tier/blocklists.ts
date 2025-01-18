/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import expect from '@kbn/expect';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  GLOBAL_ARTIFACT_TAG,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import TestAgent from 'supertest/lib/agent';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';
import { PolicyTestResourceInfo } from '../../../../../security_solution_endpoint/services/endpoint_policy';
import { ArtifactTestData } from '../../../../../security_solution_endpoint/services/endpoint_artifacts';

export default function ({ getService }: FtrProviderContext) {
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const utils = getService('securitySolutionUtils');

  // @skipInServerlessMKI due to authentication issues - we should migrate from Basic to Bearer token when available
  // @skipInServerlessMKI - if you are removing this annotation, make sure to add the test suite to the MKI pipeline in .buildkite/pipelines/security_solution_quality_gate/mki_periodic/mki_periodic_defend_workflows.yml
  describe('@ess @serverless @skipInServerlessMKI Endpoint artifacts (via lists plugin): Blocklists', function () {
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

    describe('and accessing blocklists', () => {
      const exceptionsGenerator = new ExceptionsListItemGenerator();
      let blocklistData: ArtifactTestData;

      type BlocklistApiCallsInterface<BodyReturnType = unknown> = Array<{
        method: keyof Pick<TestAgent, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
        info?: string;
        path: string;
        // The body just needs to have the properties we care about in the tests. This should cover most
        // mocks used for testing that support different interfaces
        getBody: () => BodyReturnType;
      }>;

      beforeEach(async () => {
        blocklistData = await endpointArtifactTestResources.createBlocklist({
          tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}${fleetEndpointPolicy.packagePolicy.id}`],
        });
      });

      afterEach(async () => {
        if (blocklistData) {
          await blocklistData.cleanup();
        }
      });

      const blocklistApiCalls: BlocklistApiCallsInterface<
        Pick<ExceptionListItemSchema, 'os_types' | 'tags' | 'entries'>
      > = [
        {
          method: 'post',
          info: 'create single item',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: () => {
            return exceptionsGenerator.generateBlocklistForCreate({ tags: [GLOBAL_ARTIFACT_TAG] });
          },
        },
        {
          method: 'put',
          info: 'update single item',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: () =>
            exceptionsGenerator.generateBlocklistForUpdate({
              id: blocklistData.artifact.id,
              item_id: blocklistData.artifact.item_id,
              tags: [GLOBAL_ARTIFACT_TAG],
            }),
        },
      ];

      const needsWritePrivilege: BlocklistApiCallsInterface = [
        {
          method: 'delete',
          info: 'delete single item',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}?item_id=${blocklistData.artifact.item_id}&namespace_type=${blocklistData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
      ];

      const needsReadPrivilege: BlocklistApiCallsInterface = [
        {
          method: 'get',
          info: 'single item',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}?item_id=${blocklistData.artifact.item_id}&namespace_type=${blocklistData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'get',
          info: 'list summary',
          get path() {
            return `${EXCEPTION_LIST_URL}/summary?list_id=${blocklistData.artifact.list_id}&namespace_type=${blocklistData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'get',
          info: 'find items',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${blocklistData.artifact.list_id}&namespace_type=${blocklistData.artifact.namespace_type}&page=1&per_page=1&sort_field=name&sort_order=asc`;
          },
          getBody: () => undefined,
        },
        {
          method: 'post',
          info: 'list export',
          get path() {
            return `${EXCEPTION_LIST_URL}/_export?list_id=${blocklistData.artifact.list_id}&namespace_type=${blocklistData.artifact.namespace_type}&id=${blocklistData.artifact.id}&include_expired_exceptions=true`;
          },
          getBody: () => undefined,
        },
      ];

      describe('and has authorization to manage endpoint security', () => {
        for (const blocklistApiCall of blocklistApiCalls) {
          it(`should error on [${blocklistApiCall.method}] if invalid condition entry fields are used`, async () => {
            const body = blocklistApiCall.getBody();

            body.entries[0].field = 'some.invalid.field';
            await endpointPolicyManagerSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/types that failed validation:/));
          });

          it(`should error on [${blocklistApiCall.method}] if an invalid hash is used`, async () => {
            const body = blocklistApiCall.getBody();

            body.entries = [
              {
                field: 'file.hash.md5',
                operator: 'included',
                type: 'match_any',
                value: ['1'],
              },
            ];

            await endpointPolicyManagerSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid hash/));
          });

          it(`should error on [${blocklistApiCall.method}] if no values`, async () => {
            const body = blocklistApiCall.getBody();

            body.entries = [
              {
                field: 'file.hash.md5',
                operator: 'included',
                type: 'match_any',
                value: [],
              },
            ];

            await endpointPolicyManagerSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(
                anErrorMessageWith(
                  '[request body]: entries.0.value: Array must contain at least 1 element(s)'
                )
              );
          });

          it(`should error on [${blocklistApiCall.method}] if signer is set to match_any and a string is provided`, async () => {
            const body = blocklistApiCall.getBody();

            body.os_types = ['windows'];
            body.entries = [
              {
                field: 'file.Ext.code_signature',
                entries: [
                  {
                    field: 'subject_name',
                    value: 'foo' as unknown as string[],
                    type: 'match_any',
                    operator: 'included',
                  },
                ],
                type: 'nested',
              },
            ];

            await endpointPolicyManagerSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anErrorMessageWith(/^.*(?!file\.Ext\.code_signature)/));
          });

          it(`should error on [${blocklistApiCall.method}] if signer is set to match and an array is provided`, async () => {
            const body = blocklistApiCall.getBody();

            body.os_types = ['windows'];
            body.entries = [
              {
                field: 'file.Ext.code_signature',
                entries: [
                  {
                    field: 'subject_name',
                    value: ['foo'] as unknown as string,
                    type: 'match',
                    operator: 'included',
                  },
                ],
                type: 'nested',
              },
            ];

            await endpointPolicyManagerSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anErrorMessageWith(/^.*(?!file\.Ext\.code_signature)/));
          });

          it(`should error on [${blocklistApiCall.method}] if signer is set for a non windows os entry item`, async () => {
            const body = blocklistApiCall.getBody();

            body.os_types = ['linux'];
            body.entries = [
              {
                field: 'file.Ext.code_signature',
                entries: [
                  {
                    field: 'subject_name',
                    value: 'foo',
                    type: 'match',
                    operator: 'included',
                  },
                ],
                type: 'nested',
              },
            ];

            await endpointPolicyManagerSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/^.*(?!file\.Ext\.code_signature)/));
          });

          it(`should error on [${blocklistApiCall.method}] if more than one entry and not a hash`, async () => {
            const body = blocklistApiCall.getBody();

            body.os_types = ['windows'];
            body.entries = [
              {
                field: 'file.path',
                value: ['C:\\some\\path', 'C:\\some\\other\\path', 'C:\\yet\\another\\path'],
                type: 'match_any',
                operator: 'included',
              },
              {
                field: 'file.Ext.code_signature',
                entries: [
                  {
                    field: 'subject_name',
                    value: ['notsus.exe', 'verynotsus.exe', 'superlegit.exe'],
                    type: 'match_any',
                    operator: 'included',
                  },
                ],
                type: 'nested',
              },
            ];

            await endpointPolicyManagerSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/one entry is allowed/));
          });

          it(`should error on [${blocklistApiCall.method}] if more than one OS is set`, async () => {
            const body = blocklistApiCall.getBody();

            body.os_types = ['linux', 'windows'];

            await endpointPolicyManagerSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/\[osTypes\]: array size is \[2\]/));
          });

          it(`should error on [${blocklistApiCall.method}] if policy id is invalid`, async () => {
            const body = blocklistApiCall.getBody();

            body.tags = [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`];

            // Using superuser here as we need custom license for this action
            await endpointPolicyManagerSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid policy ids/));
          });
        }
        for (const blocklistApiCall of [...needsWritePrivilege, ...needsReadPrivilege]) {
          it(`should not error on [${blocklistApiCall.method}] - [${blocklistApiCall.info}]`, async () => {
            await endpointPolicyManagerSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(blocklistApiCall.getBody() as object)
              .expect(200);
          });
        }
      });

      // no such role in serverless
      describe('@skipInServerless and user has authorization to read blocklist', function () {
        let artifactReadSupertest: TestAgent;
        before(async () => {
          artifactReadSupertest = await utils.createSuperTest(ROLE.artifact_read_privileges);
        });
        for (const blocklistApiCall of [...blocklistApiCalls, ...needsWritePrivilege]) {
          it(`should error on [${blocklistApiCall.method}] - [${blocklistApiCall.info}]`, async () => {
            await artifactReadSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(blocklistApiCall.getBody() as object)
              .expect(403);
          });
        }

        for (const blocklistApiCall of needsReadPrivilege) {
          it(`should not error on [${blocklistApiCall.method}] - [${blocklistApiCall.info}]`, async () => {
            await artifactReadSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(blocklistApiCall.getBody() as object)
              .expect(200);
          });
        }
      });

      describe('and user has no authorization to blocklist', () => {
        for (const blocklistApiCall of [
          ...blocklistApiCalls,
          ...needsWritePrivilege,
          ...needsReadPrivilege,
        ]) {
          it(`should error on [${blocklistApiCall.method}] - [${blocklistApiCall.info}]`, async () => {
            await t1AnalystSupertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(blocklistApiCall.getBody() as object)
              .expect(403);
          });
        }
      });
    });
  });
}
