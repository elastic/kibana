/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import expect from '@kbn/expect';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  GLOBAL_ARTIFACT_TAG,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import { TrustedDeviceConditionEntryField } from '@kbn/securitysolution-utils';
import type TestAgent from 'supertest/lib/agent';
import type { PolicyTestResourceInfo } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_policy';
import type { ArtifactTestData } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_artifacts';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';

export default function ({ getService }: FtrProviderContext) {
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const utils = getService('securitySolutionUtils');

  // @skipInServerlessMKI due to authentication issues - we should migrate from Basic to Bearer token when available
  // @skipInServerlessMKI - if you are removing this annotation, make sure to add the test suite to the MKI pipeline in .buildkite/pipelines/security_solution_quality_gate/mki_periodic/mki_periodic_defend_workflows.yml
  // Failing: See https://github.com/elastic/kibana/issues/248578
  describe.skip('@ess @serverless @skipInServerlessMKI Endpoint artifacts (via lists plugin): Trusted Devices', function () {
    let fleetEndpointPolicy: PolicyTestResourceInfo;
    let t1AnalystSupertest: TestAgent;
    let endpointPolicyManagerSupertest: TestAgent;

    before(async () => {
      t1AnalystSupertest = await utils.createSuperTest(ROLE.t1_analyst);
      endpointPolicyManagerSupertest = await utils.createSuperTest(ROLE.endpoint_policy_manager);

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
    const aValidationError = (res: { body: { message: string } }) => {
      // Match either EndpointArtifactError or OpenAPI validation errors
      expect(res.body.message).to.match(/(EndpointArtifactError|\[request body\])/);
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

    describe('and accessing trusted devices', () => {
      const exceptionsGenerator = new ExceptionsListItemGenerator();
      let trustedDeviceData: ArtifactTestData;

      type TrustedDeviceApiCallsInterface<BodyReturnType = unknown> = Array<{
        method: keyof Pick<TestAgent, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
        info?: string;
        path: string;
        // The body just needs to have the properties we care about in the tests. This should cover most
        // mocks used for testing that support different interfaces
        getBody: () => BodyReturnType;
      }>;

      beforeEach(async () => {
        trustedDeviceData = await endpointArtifactTestResources.createTrustedDevice({
          tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}${fleetEndpointPolicy.packagePolicy.id}`],
        });
      });

      afterEach(async () => {
        if (trustedDeviceData) {
          await trustedDeviceData.cleanup();
        }
      });

      const trustedDeviceApiCalls: TrustedDeviceApiCallsInterface<
        Pick<ExceptionListItemSchema, 'os_types' | 'tags' | 'entries'>
      > = [
        {
          method: 'post',
          info: 'create single item',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: () => {
            return exceptionsGenerator.generateTrustedDeviceForCreate({
              tags: [GLOBAL_ARTIFACT_TAG],
            });
          },
        },
        {
          method: 'put',
          info: 'update single item',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: () =>
            exceptionsGenerator.generateTrustedDeviceForUpdate({
              id: trustedDeviceData.artifact.id,
              item_id: trustedDeviceData.artifact.item_id,
              tags: [GLOBAL_ARTIFACT_TAG],
            }),
        },
      ];

      const needsWritePrivilege: TrustedDeviceApiCallsInterface = [
        {
          method: 'delete',
          info: 'delete single item',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}?item_id=${trustedDeviceData.artifact.item_id}&namespace_type=${trustedDeviceData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
      ];

      const needsReadPrivilege: TrustedDeviceApiCallsInterface = [
        {
          method: 'get',
          info: 'single item',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}?item_id=${trustedDeviceData.artifact.item_id}&namespace_type=${trustedDeviceData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'get',
          info: 'list summary',
          get path() {
            return `${EXCEPTION_LIST_URL}/summary?list_id=${trustedDeviceData.artifact.list_id}&namespace_type=${trustedDeviceData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'get',
          info: 'find items',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${trustedDeviceData.artifact.list_id}&namespace_type=${trustedDeviceData.artifact.namespace_type}&page=1&per_page=1&sort_field=name&sort_order=asc`;
          },
          getBody: () => undefined,
        },
        {
          method: 'post',
          info: 'list export',
          get path() {
            return `${EXCEPTION_LIST_URL}/_export?list_id=${trustedDeviceData.artifact.list_id}&namespace_type=${trustedDeviceData.artifact.namespace_type}&id=${trustedDeviceData.artifact.id}&include_expired_exceptions=true`;
          },
          getBody: () => undefined,
        },
      ];

      describe('and has authorization to write trusted devices', () => {
        for (const trustedDeviceApiCall of trustedDeviceApiCalls) {
          it(`should error on [${trustedDeviceApiCall.method}] if invalid condition entry fields are used`, async () => {
            const body = trustedDeviceApiCall.getBody();

            body.entries[0].field = 'some.invalid.field';

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/types that failed validation:/));
          });

          it(`should error on [${trustedDeviceApiCall.method}] if a condition entry field is used more than once`, async () => {
            const body = trustedDeviceApiCall.getBody();

            body.entries.push({ ...body.entries[0] });

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/Duplicate/));
          });

          it(`should error on [${trustedDeviceApiCall.method}] if an empty field value is used`, async () => {
            const body = trustedDeviceApiCall.getBody();

            body.entries = [
              {
                field: TrustedDeviceConditionEntryField.USERNAME,
                operator: 'included',
                type: 'match',
                value: '',
              },
            ];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(aValidationError)
              .expect(
                anErrorMessageWith(
                  /String must contain at least 1 character|No empty strings allowed|Field value cannot be empty/
                )
              );
          });

          it(`should allow single Windows OS on [${trustedDeviceApiCall.method}]`, async () => {
            const body = trustedDeviceApiCall.getBody();

            // Match request version with artifact version
            if ('_version' in body) {
              body._version = trustedDeviceData.artifact._version;
            }

            body.os_types = ['windows'];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(200);
          });

          it(`should allow single Mac OS on [${trustedDeviceApiCall.method}]`, async () => {
            const body = trustedDeviceApiCall.getBody();

            // Match request version with artifact version
            if ('_version' in body) {
              body._version = trustedDeviceData.artifact._version;
            }

            body.os_types = ['macos'];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(200);
          });

          it(`should allow Windows and Mac combination on [${trustedDeviceApiCall.method}]`, async () => {
            const body = trustedDeviceApiCall.getBody();

            // Match request version with artifact version
            if ('_version' in body) {
              body._version = trustedDeviceData.artifact._version;
            }

            body.os_types = ['windows', 'macos'];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(200);
          });

          it(`should error on [${trustedDeviceApiCall.method}] if Linux OS is used`, async () => {
            const body = trustedDeviceApiCall.getBody();

            body.os_types = ['linux'];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(aValidationError)
              .expect(
                anErrorMessageWith(
                  /expected value to equal \[windows\]|expected value to equal \[macos\]/
                )
              );
          });

          it(`should error on [${trustedDeviceApiCall.method}] if too many OS types are used`, async () => {
            const body = trustedDeviceApiCall.getBody();

            body.os_types = ['windows', 'macos', 'linux'];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(aValidationError)
              .expect(
                anErrorMessageWith(
                  /expected value to equal \[windows\]|expected value to equal \[macos\]/
                )
              );
          });

          it(`should error on [${trustedDeviceApiCall.method}] if duplicate OS types are used`, async () => {
            const body = trustedDeviceApiCall.getBody();

            body.os_types = ['windows', 'windows'];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/Duplicate OS entries are not allowed/));
          });

          it(`should error on [${trustedDeviceApiCall.method}] if duplicate Mac OS types are used`, async () => {
            const body = trustedDeviceApiCall.getBody();

            body.os_types = ['macos', 'macos'];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/Duplicate OS entries are not allowed/));
          });

          it(`should allow USERNAME field with Windows-only OS on [${trustedDeviceApiCall.method}]`, async () => {
            const body = trustedDeviceApiCall.getBody();

            if ('_version' in body) {
              body._version = trustedDeviceData.artifact._version;
            }

            body.os_types = ['windows'];
            body.entries = [
              {
                field: TrustedDeviceConditionEntryField.USERNAME,
                operator: 'included',
                type: 'match',
                value: 'test-user',
              },
            ];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(200);
          });

          it(`should error on [${trustedDeviceApiCall.method}] if USERNAME field is used with Mac-only OS`, async () => {
            const body = trustedDeviceApiCall.getBody();

            body.os_types = ['macos'];
            body.entries = [
              {
                field: TrustedDeviceConditionEntryField.USERNAME,
                operator: 'included',
                type: 'match',
                value: 'test-user',
              },
            ];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(
                anErrorMessageWith(/Username field is only supported for Windows OS exclusively/)
              );
          });

          it(`should error on [${trustedDeviceApiCall.method}] if USERNAME field is used with Windows+Mac OS`, async () => {
            const body = trustedDeviceApiCall.getBody();

            body.os_types = ['windows', 'macos'];
            body.entries = [
              {
                field: TrustedDeviceConditionEntryField.USERNAME,
                operator: 'included',
                type: 'match',
                value: 'test-user',
              },
            ];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(
                anErrorMessageWith(/Username field is only supported for Windows OS exclusively/)
              );
          });

          for (const field of Object.values(TrustedDeviceConditionEntryField)) {
            if (field === TrustedDeviceConditionEntryField.USERNAME) {
              continue; // Skip USERNAME field - handled separately above
            }

            it(`should allow valid ${field} field with any OS on [${trustedDeviceApiCall.method}]`, async () => {
              const body = trustedDeviceApiCall.getBody();

              // Match request version with artifact version
              if ('_version' in body) {
                body._version = trustedDeviceData.artifact._version;
              }

              body.entries = [
                {
                  field,
                  operator: 'included',
                  type: 'match',
                  value: 'test-value',
                },
              ];

              await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
                trustedDeviceApiCall.path
              )
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(200);
            });
          }

          // Test all supported entry types
          it(`should allow 'match' entry type on [${trustedDeviceApiCall.method}]`, async () => {
            const body = trustedDeviceApiCall.getBody();

            // Match request version with artifact version
            if ('_version' in body) {
              body._version = trustedDeviceData.artifact._version;
            }

            body.os_types = ['windows'];
            body.entries = [
              {
                field: TrustedDeviceConditionEntryField.USERNAME,
                operator: 'included',
                type: 'match',
                value: 'test-user',
              },
            ];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(200);
          });

          it(`should allow 'wildcard' entry type on [${trustedDeviceApiCall.method}]`, async () => {
            const body = trustedDeviceApiCall.getBody();

            // Match request version with artifact version
            if ('_version' in body) {
              body._version = trustedDeviceData.artifact._version;
            }

            body.entries = [
              {
                field: TrustedDeviceConditionEntryField.HOST,
                operator: 'included',
                type: 'wildcard',
                value: 'test-host-*',
              },
            ];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(200);
          });

          it(`should allow 'match_any' entry type on [${trustedDeviceApiCall.method}]`, async () => {
            const body = trustedDeviceApiCall.getBody();

            // Match request version with artifact version
            if ('_version' in body) {
              body._version = trustedDeviceData.artifact._version;
            }

            body.entries = [
              {
                field: TrustedDeviceConditionEntryField.DEVICE_ID,
                operator: 'included',
                type: 'match_any',
                value: ['device-1', 'device-2'],
              },
            ];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(200);
          });

          it(`should error on [${trustedDeviceApiCall.method}] if invalid entry type is used`, async () => {
            const body = trustedDeviceApiCall.getBody();

            body.entries = [
              {
                field: TrustedDeviceConditionEntryField.USERNAME,
                operator: 'included',
                type: 'invalid_type' as unknown as 'wildcard', // Force an invalid type
                value: 'test-value',
              },
            ];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(aValidationError)
              .expect(anErrorMessageWith(/Invalid discriminator value|Expected.*match.*wildcard/));
          });

          it(`should error on [${trustedDeviceApiCall.method}] if policy id is invalid`, async () => {
            const body = trustedDeviceApiCall.getBody();

            body.tags = [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`];

            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid policy ids/));
          });
        }

        for (const trustedDeviceApiCall of [...needsWritePrivilege, ...needsReadPrivilege]) {
          it(`should not error on [${trustedDeviceApiCall.method}] - [${trustedDeviceApiCall.info}]`, async () => {
            await endpointPolicyManagerSupertest[trustedDeviceApiCall.method](
              trustedDeviceApiCall.path
            )
              .set('kbn-xsrf', 'true')
              .send(trustedDeviceApiCall.getBody() as object)
              .expect(200);
          });
        }
      });

      // no such role in serverless
      describe('@skipInServerless and user has authorization to read trusted devices', function () {
        let hunterSupertest: TestAgent;
        before(async () => {
          hunterSupertest = await utils.createSuperTest(ROLE.hunter);
        });

        for (const trustedDeviceApiCall of [...trustedDeviceApiCalls, ...needsWritePrivilege]) {
          it(`should error on [${trustedDeviceApiCall.method}] - [${trustedDeviceApiCall.info}]`, async () => {
            await hunterSupertest[trustedDeviceApiCall.method](trustedDeviceApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(trustedDeviceApiCall.getBody() as object)
              .expect(403);
          });
        }

        for (const trustedDeviceApiCall of needsReadPrivilege) {
          it(`should not error on [${trustedDeviceApiCall.method}] - [${trustedDeviceApiCall.info}]`, async () => {
            await hunterSupertest[trustedDeviceApiCall.method](trustedDeviceApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(trustedDeviceApiCall.getBody() as object)
              .expect(200);
          });
        }
      });

      describe('and user has no authorization to trusted devices', () => {
        for (const trustedDeviceApiCall of [
          ...trustedDeviceApiCalls,
          ...needsWritePrivilege,
          ...needsReadPrivilege,
        ]) {
          it(`should error on [${trustedDeviceApiCall.method}] - [${trustedDeviceApiCall.info}]`, async () => {
            await t1AnalystSupertest[trustedDeviceApiCall.method](trustedDeviceApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(trustedDeviceApiCall.getBody() as object)
              .expect(403);
          });
        }
      });
    });
  });
}
