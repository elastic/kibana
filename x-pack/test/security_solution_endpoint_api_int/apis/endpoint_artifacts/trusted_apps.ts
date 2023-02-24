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
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../../security_solution_endpoint/services/endpoint_policy';
import { ArtifactTestData } from '../../../security_solution_endpoint/services/endpoint_artifacts';
import { ROLE } from '../../services/roles_users';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');

  describe('Endpoint artifacts (via lists plugin): Trusted Applications', () => {
    let fleetEndpointPolicy: PolicyTestResourceInfo;

    before(async () => {
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
        method: keyof Pick<typeof supertest, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
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

            await supertestWithoutAuth[trustedAppApiCall.method](trustedAppApiCall.path)
              .auth(ROLE.endpoint_security_policy_manager, 'changeme')
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/types that failed validation:/));
          });

          it(`should error on [${trustedAppApiCall.method}] if a condition entry field is used more than once`, async () => {
            const body = trustedAppApiCall.getBody();

            body.entries.push({ ...body.entries[0] });

            await supertestWithoutAuth[trustedAppApiCall.method](trustedAppApiCall.path)
              .auth(ROLE.endpoint_security_policy_manager, 'changeme')
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

            await supertestWithoutAuth[trustedAppApiCall.method](trustedAppApiCall.path)
              .auth(ROLE.endpoint_security_policy_manager, 'changeme')
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid hash/));
          });

          it(`should error on [${trustedAppApiCall.method}] if signer is set for a non windows os entry item`, async () => {
            const body = trustedAppApiCall.getBody();

            body.os_types = ['linux'];
            body.entries = [
              {
                field: 'process.Ext.code_signature',
                entries: [
                  {
                    field: 'trusted',
                    value: 'true',
                    type: 'match',
                    operator: 'included',
                  },
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

            await supertestWithoutAuth[trustedAppApiCall.method](trustedAppApiCall.path)
              .auth(ROLE.endpoint_security_policy_manager, 'changeme')
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/^.*(?!process\.Ext\.code_signature)/));
          });

          it(`should error on [${trustedAppApiCall.method}] if more than one OS is set`, async () => {
            const body = trustedAppApiCall.getBody();

            body.os_types = ['linux', 'windows'];

            await supertestWithoutAuth[trustedAppApiCall.method](trustedAppApiCall.path)
              .auth(ROLE.endpoint_security_policy_manager, 'changeme')
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
            await supertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .auth(ROLE.endpoint_security_policy_manager, 'changeme')
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid policy ids/));
          });
        }
        for (const trustedAppApiCall of [...needsWritePrivilege, ...needsReadPrivilege]) {
          it(`should not error on [${trustedAppApiCall.method}] - [${trustedAppApiCall.info}]`, async () => {
            await supertestWithoutAuth[trustedAppApiCall.method](trustedAppApiCall.path)
              .auth(ROLE.endpoint_security_policy_manager, 'changeme')
              .set('kbn-xsrf', 'true')
              .send(trustedAppApiCall.getBody())
              .expect(200);
          });
        }
      });

      describe('and user has authorization to read trusted apps', () => {
        for (const trustedAppApiCall of [...trustedAppApiCalls, ...needsWritePrivilege]) {
          it(`should error on [${trustedAppApiCall.method}] - [${trustedAppApiCall.info}]`, async () => {
            await supertestWithoutAuth[trustedAppApiCall.method](trustedAppApiCall.path)
              .auth(ROLE.artifact_read_role, 'changeme')
              .set('kbn-xsrf', 'true')
              .send(trustedAppApiCall.getBody())
              .expect(403, {
                status_code: 403,
                message: 'EndpointArtifactError: Endpoint authorization failure',
              });
          });
        }

        for (const trustedAppApiCall of needsReadPrivilege) {
          it(`should not error on [${trustedAppApiCall.method}] - [${trustedAppApiCall.info}]`, async () => {
            await supertestWithoutAuth[trustedAppApiCall.method](trustedAppApiCall.path)
              .auth(ROLE.artifact_read_role, 'changeme')
              .set('kbn-xsrf', 'true')
              .send(trustedAppApiCall.getBody())
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
            await supertestWithoutAuth[trustedAppApiCall.method](trustedAppApiCall.path)
              .auth(ROLE.t1_analyst, 'changeme')
              .set('kbn-xsrf', 'true')
              .send(trustedAppApiCall.getBody())
              .expect(403, {
                status_code: 403,
                message: 'EndpointArtifactError: Endpoint authorization failure',
              });
          });
        }
      });
    });
  });
}
