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
  TRUSTED_PROCESS_DESCENDANTS_TAG,
} from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
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
  // FLAKY: https://github.com/elastic/kibana/issues/246356
  describe.skip('@ess @serverless @skipInServerlessMKI Endpoint artifacts (via lists plugin): Trusted Applications', function () {
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

    describe('and accessing trusted apps', () => {
      const exceptionsGenerator = new ExceptionsListItemGenerator();
      let trustedAppData: ArtifactTestData;

      type TrustedAppApiCallsInterface<BodyReturnType = unknown> = Array<{
        method: keyof Pick<TestAgent, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
        info?: string;
        path: string;
        // The body just needs to have the properties we care about in the tests. This should cover most
        // mocks used for testing that support different interfaces
        getBody: () => BodyReturnType;
      }>;

      beforeEach(async () => {
        trustedAppData = await endpointArtifactTestResources.createTrustedApp({
          tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}${fleetEndpointPolicy.packagePolicy.id}`],
        });
      });

      afterEach(async () => {
        if (trustedAppData) {
          await trustedAppData.cleanup();
        }
      });

      const trustedAppApiCalls: TrustedAppApiCallsInterface<
        Pick<ExceptionListItemSchema, 'os_types' | 'tags' | 'entries'>
      > = [
        {
          method: 'post',
          info: 'create single item',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: () => {
            return exceptionsGenerator.generateTrustedAppForCreate({ tags: [GLOBAL_ARTIFACT_TAG] });
          },
        },
        {
          method: 'put',
          info: 'update single item',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: () =>
            exceptionsGenerator.generateTrustedAppForUpdate({
              id: trustedAppData.artifact.id,
              item_id: trustedAppData.artifact.item_id,
              tags: [GLOBAL_ARTIFACT_TAG],
            }),
        },
      ];

      const needsWritePrivilege: TrustedAppApiCallsInterface = [
        {
          method: 'delete',
          info: 'delete single item',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}?item_id=${trustedAppData.artifact.item_id}&namespace_type=${trustedAppData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
      ];

      const needsReadPrivilege: TrustedAppApiCallsInterface = [
        {
          method: 'get',
          info: 'single item',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}?item_id=${trustedAppData.artifact.item_id}&namespace_type=${trustedAppData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'get',
          info: 'list summary',
          get path() {
            return `${EXCEPTION_LIST_URL}/summary?list_id=${trustedAppData.artifact.list_id}&namespace_type=${trustedAppData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'get',
          info: 'find items',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${trustedAppData.artifact.list_id}&namespace_type=${trustedAppData.artifact.namespace_type}&page=1&per_page=1&sort_field=name&sort_order=asc`;
          },
          getBody: () => undefined,
        },
        {
          method: 'post',
          info: 'list export',
          get path() {
            return `${EXCEPTION_LIST_URL}/_export?list_id=${trustedAppData.artifact.list_id}&namespace_type=${trustedAppData.artifact.namespace_type}&id=${trustedAppData.artifact.id}&include_expired_exceptions=true`;
          },
          getBody: () => undefined,
        },
      ];

      describe('and has authorization to write trusted apps', () => {
        for (const trustedAppApiCall of trustedAppApiCalls) {
          it(`should error on [${trustedAppApiCall.method}] if invalid condition entry fields are used`, async () => {
            const body = trustedAppApiCall.getBody();

            body.entries[0].field = 'some.invalid.field';

            await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/types that failed validation:/));
          });

          it(`should error on [${trustedAppApiCall.method}] if a condition entry field is used more than once`, async () => {
            const body = trustedAppApiCall.getBody();

            body.entries.push({ ...body.entries[0] });

            await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/Duplicate/));
          });

          it(`should error on [${trustedAppApiCall.method}] if an invalid hash is used`, async () => {
            const body = trustedAppApiCall.getBody();

            body.entries = [
              {
                field: 'process.hash.md5',
                operator: 'included',
                type: 'match',
                value: '1',
              },
            ];

            await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid hash/));
          });

          it(`should error on [${trustedAppApiCall.method}] if signer is set for a non windows os entry item`, async () => {
            const body = trustedAppApiCall.getBody();

            body.os_types = ['linux'];
            body.entries = exceptionsGenerator.generateTrustedAppSignerEntry();

            await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/^.*(?!process\.Ext\.code_signature)/));
          });

          it(`should error on [${trustedAppApiCall.method} if Mac signer field is used for Windows entry`, async () => {
            const body = trustedAppApiCall.getBody();

            body.os_types = ['windows'];
            body.entries = exceptionsGenerator.generateTrustedAppSignerEntry('mac');

            await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400);
          });

          it(`should error on [${trustedAppApiCall.method} if Windows signer field is used for Mac entry`, async () => {
            const body = trustedAppApiCall.getBody();

            body.os_types = ['macos'];
            body.entries = exceptionsGenerator.generateTrustedAppSignerEntry();

            await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400);
          });

          it('should not error if signer is set for a windows os entry item', async () => {
            const body = trustedAppApiCall.getBody();

            // Match request version with artifact version
            if ('_version' in body) {
              body._version = trustedAppData.artifact._version;
            }
            return body;

            body.os_types = ['windows'];
            body.entries = exceptionsGenerator.generateTrustedAppSignerEntry();

            await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(200);
          });

          it('should not error if signer is set for a mac os entry item', async () => {
            const body = trustedAppApiCall.getBody();

            // Match request version with artifact version
            if ('_version' in body) {
              body._version = trustedAppData.artifact._version;
            }
            return body;

            body.os_types = ['macos'];
            body.entries = exceptionsGenerator.generateTrustedAppSignerEntry('mac');
            await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(200);
          });

          it(`should error on [${trustedAppApiCall.method}] if more than one OS is set`, async () => {
            const body = trustedAppApiCall.getBody();

            body.os_types = ['linux', 'windows'];

            await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/\[osTypes\]: array size is \[2\]/));
          });

          it(`should error on [${trustedAppApiCall.method}] if policy id is invalid`, async () => {
            const body = trustedAppApiCall.getBody();

            body.tags = [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`];

            // Using superuser here as we need custom license for this action
            await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid policy ids/));
          });

          it(`should error on [${trustedAppApiCall.method}] if process descendants is used in basic mode`, async () => {
            const body = trustedAppApiCall.getBody();
            body.tags.push(TRUSTED_PROCESS_DESCENDANTS_TAG);

            await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(
                anErrorMessageWith(/Process descendants feature is only allowed on advanced mode/)
              );
          });

          describe('when in advanced form mode', () => {
            const getAdvancedModeBody = () => {
              const body = trustedAppApiCall.getBody();
              body.tags.push('form_mode:advanced');

              // Match request version with artifact version
              if ('_version' in body) {
                body._version = trustedAppData.artifact._version;
              }
              return body;
            };

            it(`should NOT error on [${trustedAppApiCall.method}] if invalid condition entry fields are used`, async () => {
              const body = getAdvancedModeBody();
              body.entries[0].field = 'some.invalid.field';

              await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(200);
            });

            it(`should NOT error on [${trustedAppApiCall.method}] if a condition entry field is used more than once`, async () => {
              const body = getAdvancedModeBody();
              body.entries.push({ ...body.entries[0] });

              await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(200);
            });

            it(`should NOT error on [${trustedAppApiCall.method}] if an invalid hash is used`, async () => {
              const body = getAdvancedModeBody();

              body.entries = [
                {
                  field: 'process.hash.md5',
                  operator: 'included',
                  type: 'match',
                  value: '1',
                },
              ];

              await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(200);
            });

            it(`should NOT error on [${trustedAppApiCall.method}] if signer is set for a non windows os entry item`, async () => {
              const body = getAdvancedModeBody();

              body.os_types = ['linux'];
              body.entries = exceptionsGenerator.generateTrustedAppSignerEntry();

              await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(200);
            });

            it(`should NOT error on [${trustedAppApiCall.method} if Mac signer field is used for Windows entry`, async () => {
              const body = getAdvancedModeBody();

              body.os_types = ['windows'];
              body.entries = exceptionsGenerator.generateTrustedAppSignerEntry('mac');

              await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(200);
            });

            it(`should NOT error on [${trustedAppApiCall.method} if Windows signer field is used for Mac entry`, async () => {
              const body = getAdvancedModeBody();

              body.os_types = ['macos'];
              body.entries = exceptionsGenerator.generateTrustedAppSignerEntry();

              await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(200);
            });

            it('should NOT error if signer is set for a windows os entry item', async () => {
              const body = getAdvancedModeBody();

              body.os_types = ['windows'];
              body.entries = exceptionsGenerator.generateTrustedAppSignerEntry();

              await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(200);
            });

            it('should NOT error if signer is set for a mac os entry item', async () => {
              const body = getAdvancedModeBody();

              body.os_types = ['macos'];
              body.entries = exceptionsGenerator.generateTrustedAppSignerEntry('mac');
              await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(200);
            });

            it(`should NOT error on [${trustedAppApiCall.method}] if process descendants is used`, async () => {
              const body = getAdvancedModeBody();

              body.tags.push(TRUSTED_PROCESS_DESCENDANTS_TAG);

              await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(200);
            });

            it(`should error on [${trustedAppApiCall.method}] if more than one OS is set`, async () => {
              const body = getAdvancedModeBody();

              body.os_types = ['linux', 'windows'];

              await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(400)
                .expect(anEndpointArtifactError)
                .expect(anErrorMessageWith(/\[osTypes\]: array size is \[2\]/));
            });

            it(`should error on [${trustedAppApiCall.method}] if policy id is invalid`, async () => {
              const body = getAdvancedModeBody();

              body.tags = [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`];

              // Using superuser here as we need custom license for this action
              await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
                .set('kbn-xsrf', 'true')
                .send(body)
                .expect(400)
                .expect(anEndpointArtifactError)
                .expect(anErrorMessageWith(/invalid policy ids/));
            });
          });
        }
        for (const trustedAppApiCall of [...needsWritePrivilege, ...needsReadPrivilege]) {
          it(`should not error on [${trustedAppApiCall.method}] - [${trustedAppApiCall.info}]`, async () => {
            await endpointPolicyManagerSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(trustedAppApiCall.getBody() as object)
              .expect(200);
          });
        }
      });

      // no such role in serverless
      describe('@skipInServerless and user has authorization to read trusted apps', function () {
        let hunterSupertest: TestAgent;
        before(async () => {
          hunterSupertest = await utils.createSuperTest(ROLE.hunter);
        });

        for (const trustedAppApiCall of [...trustedAppApiCalls, ...needsWritePrivilege]) {
          it(`should error on [${trustedAppApiCall.method}] - [${trustedAppApiCall.info}]`, async () => {
            await hunterSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(trustedAppApiCall.getBody() as object)
              .expect(403);
          });
        }

        for (const trustedAppApiCall of needsReadPrivilege) {
          it(`should not error on [${trustedAppApiCall.method}] - [${trustedAppApiCall.info}]`, async () => {
            await hunterSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(trustedAppApiCall.getBody() as object)
              .expect(200);
          });
        }
      });

      describe('and user has no authorization to trusted apps', () => {
        for (const trustedAppApiCall of [
          ...trustedAppApiCalls,
          ...needsWritePrivilege,
          ...needsReadPrivilege,
        ]) {
          it(`should error on [${trustedAppApiCall.method}] - [${trustedAppApiCall.info}]`, async () => {
            await t1AnalystSupertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(trustedAppApiCall.getBody() as object)
              .expect(403);
          });
        }
      });
    });
  });
}
