/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import type { EntryMatch, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import expect from '@kbn/expect';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  GLOBAL_ARTIFACT_TAG,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import type TestAgent from 'supertest/lib/agent';
import type { PolicyTestResourceInfo } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_policy';
import type { ArtifactTestData } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_artifacts';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';
import { MAX_YARA_RULE_CONTENT_LENGTH } from '@kbn/security-solution-plugin/server/lists_integration/endpoint/validators/custom_yara_signatures_validator';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const utils = getService('securitySolutionUtils');

  // @skipInServerlessMKI due to authentication issues - we should migrate from Basic to Bearer token when available
  // @skipInServerlessMKI - if you are removing this annotation, make sure to add the test suite to the MKI pipeline in .buildkite/pipelines/security_solution_quality_gate/mki_periodic/mki_periodic_defend_workflows.yml
  describe('@ess @serverless @skipInServerlessMKI Endpoint artifacts (via lists plugin): Custom YARA Signatures', function () {
    let fleetEndpointPolicy: PolicyTestResourceInfo;

    let noAccessTestAgent: TestAgent;
    let readAccessTestAgent: TestAgent;
    let globalWriteAccessTestAgent: TestAgent;

    before(async () => {
      const createCustomRole = (name: string, privileges: string[]) => ({
        name,
        privileges: {
          kibana: [
            {
              base: [],
              feature: {
                [SECURITY_FEATURE_ID]: privileges,
              },
              spaces: ['*'],
            },
          ],
          elasticsearch: { cluster: [], indices: [] },
        },
      });

      noAccessTestAgent = await utils.createSuperTestWithCustomRole(
        createCustomRole('no_access_role', ['all'])
      );
      readAccessTestAgent = await utils.createSuperTestWithCustomRole(
        createCustomRole('read_access_role', ['all', 'custom_yara_signatures_read'])
      );
      globalWriteAccessTestAgent = await utils.createSuperTestWithCustomRole(
        createCustomRole('global_write_access_role', [
          'all',
          'custom_yara_signatures_all',
          'global_artifact_management_all',
        ])
      );

      fleetEndpointPolicy = await endpointPolicyTestResources.createPolicy();
    });

    after(async () => {
      await utils.cleanUpCustomRoles();

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

    describe('and accessing Custom YARA signatures', () => {
      const exceptionsGenerator = new ExceptionsListItemGenerator();
      let customYaraSignatureData: ArtifactTestData;

      interface YaraSignatureApiCallInterface<BodyReturnType = unknown> {
        method: keyof Pick<TestAgent, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
        info?: string;
        path: string;
        getBody: () => BodyReturnType;
      }

      beforeEach(async () => {
        customYaraSignatureData = await endpointArtifactTestResources.createCustomYaraSignature({
          tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}${fleetEndpointPolicy.packagePolicy.id}`],
        });
      });

      afterEach(async () => {
        if (customYaraSignatureData) {
          await customYaraSignatureData.cleanup();
        }
      });

      const createUpdateApiCalls: Array<
        YaraSignatureApiCallInterface<
          Pick<ExceptionListItemSchema, 'os_types' | 'tags' | 'entries'>
        >
      > = [
        {
          method: 'post',
          info: 'create single item',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: () => {
            return exceptionsGenerator.generateCustomYaraSignatureForCreate({
              tags: [GLOBAL_ARTIFACT_TAG],
            });
          },
        },
        {
          method: 'put',
          info: 'update single item',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: () =>
            exceptionsGenerator.generateCustomYaraSignatureForUpdate({
              id: customYaraSignatureData.artifact.id,
              item_id: customYaraSignatureData.artifact.item_id,
              tags: [GLOBAL_ARTIFACT_TAG],
              _version: customYaraSignatureData.artifact._version,
            }),
        },
      ];

      const deleteApiCall: YaraSignatureApiCallInterface = {
        method: 'delete',
        info: 'delete single item',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}?item_id=${customYaraSignatureData.artifact.item_id}&namespace_type=${customYaraSignatureData.artifact.namespace_type}`;
        },
        getBody: () => undefined,
      };

      const readPrivilegeApiCalls: Array<YaraSignatureApiCallInterface> = [
        {
          method: 'get',
          info: 'single item',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}?item_id=${customYaraSignatureData.artifact.item_id}&namespace_type=${customYaraSignatureData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'get',
          info: 'list summary',
          get path() {
            return `${EXCEPTION_LIST_URL}/summary?list_id=${customYaraSignatureData.artifact.list_id}&namespace_type=${customYaraSignatureData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'get',
          info: 'find items',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${customYaraSignatureData.artifact.list_id}&namespace_type=${customYaraSignatureData.artifact.namespace_type}&page=1&per_page=1&sort_field=name&sort_order=asc`;
          },
          getBody: () => undefined,
        },
        {
          method: 'post',
          info: 'list export',
          get path() {
            return `${EXCEPTION_LIST_URL}/_export?list_id=${customYaraSignatureData.artifact.list_id}&namespace_type=${customYaraSignatureData.artifact.namespace_type}&id=${customYaraSignatureData.artifact.id}&include_expired_exceptions=true`;
          },
          getBody: () => undefined,
        },
      ];

      describe('and user has YARA write + global artifact management privileges', () => {
        for (const customYaraSignatureApiCall of createUpdateApiCalls) {
          it(`should error on [${customYaraSignatureApiCall.method}] if invalid entry field is used`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            body.entries[0].field = 'some.invalid.field' as (typeof body.entries)[0]['field'];
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/expected value to equal \[custom_yara_signature\]/));
          });

          // todo: deeper YARA rules validation is coming soon
          it(`should error on [${customYaraSignatureApiCall.method}] if rule value is empty`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            (body.entries[0] as EntryMatch).value = '';
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anErrorMessageWith(/Too small/));
          });

          it(`should accept item on [${customYaraSignatureApiCall.method}] if rule value is ${MAX_YARA_RULE_CONTENT_LENGTH} characters long`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            (body.entries[0] as EntryMatch).value = 'a'.repeat(MAX_YARA_RULE_CONTENT_LENGTH);
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(200);
          });

          it(`should error on [${customYaraSignatureApiCall.method}] if rule value is more than ${MAX_YARA_RULE_CONTENT_LENGTH} characters long`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            (body.entries[0] as EntryMatch).value = 'a'.repeat(MAX_YARA_RULE_CONTENT_LENGTH + 1);
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/maximum length/));
          });

          it(`should error on [${customYaraSignatureApiCall.method}] if more than one entry`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            body.entries = [...body.entries, { ...body.entries[0] }];
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/\[entries\]: array size is \[2\]/));
          });

          it(`should accept item on [${customYaraSignatureApiCall.method}] if more than one OS is set`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            body.os_types = ['linux', 'windows', 'macos'];
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(200);
          });

          it(`should error on [${customYaraSignatureApiCall.method}] if invalid OS is set`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            (body.os_types as string[]) = ['invalid-os'];
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anErrorMessageWith(/os_types.*Invalid option/));
          });

          it(`should error on [${customYaraSignatureApiCall.method}] if policy id is invalid`, async () => {
            const body = customYaraSignatureApiCall.getBody();

            body.tags = [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`];
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid policy ids/));
          });
        }

        for (const customYaraSignatureApiCall of [deleteApiCall, ...readPrivilegeApiCalls]) {
          it(`should not error on [${customYaraSignatureApiCall.method}] - [${customYaraSignatureApiCall.info}]`, async () => {
            await globalWriteAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(customYaraSignatureApiCall.getBody() as object)
              .expect(200);
          });
        }
      });

      describe('and user has authorization to read Custom YARA signatures', function () {
        for (const customYaraSignatureApiCall of [...createUpdateApiCalls, deleteApiCall]) {
          it(`should error on [${customYaraSignatureApiCall.method}] - [${customYaraSignatureApiCall.info}]`, async () => {
            await readAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(customYaraSignatureApiCall.getBody() as object)
              .expect(403);
          });
        }

        for (const customYaraSignatureApiCall of readPrivilegeApiCalls) {
          it(`should not error on [${customYaraSignatureApiCall.method}] - [${customYaraSignatureApiCall.info}]`, async () => {
            await readAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(customYaraSignatureApiCall.getBody() as object)
              .expect(200);
          });
        }
      });

      describe('and user has no authorization to Custom YARA signatures', () => {
        for (const customYaraSignatureApiCall of [
          ...createUpdateApiCalls,
          deleteApiCall,
          ...readPrivilegeApiCalls,
        ]) {
          it(`should error on [${customYaraSignatureApiCall.method}] - [${customYaraSignatureApiCall.info}]`, async () => {
            await noAccessTestAgent[customYaraSignatureApiCall.method](
              customYaraSignatureApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(customYaraSignatureApiCall.getBody() as object)
              .expect(403);
          });
        }
      });
    });
  });
}
