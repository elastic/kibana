/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../../security_solution_endpoint/services/endpoint_policy';
import { ArtifactTestData } from '../../../security_solution_endpoint/services//endpoint_artifacts';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  GLOBAL_ARTIFACT_TAG,
} from '../../../../plugins/security_solution/common/endpoint/service/artifacts';
import { ExceptionsListItemGenerator } from '../../../../plugins/security_solution/common/endpoint/data_generators/exceptions_list_item_generator';
import {
  createUserAndRole,
  deleteUserAndRole,
  ROLES,
} from '../../../common/services/security_solution';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');

  describe('Endpoint artifacts (via lists plugin): Blocklists', () => {
    let fleetEndpointPolicy: PolicyTestResourceInfo;

    before(async () => {
      // Create an endpoint policy in fleet we can work with
      fleetEndpointPolicy = await endpointPolicyTestResources.createPolicy();

      // create role/user
      await createUserAndRole(getService, ROLES.detections_admin);
    });

    after(async () => {
      if (fleetEndpointPolicy) {
        await fleetEndpointPolicy.cleanup();
      }

      // delete role/user
      await deleteUserAndRole(getService, ROLES.detections_admin);
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
        method: keyof Pick<typeof supertest, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
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
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: () => {
            return exceptionsGenerator.generateBlocklistForCreate({ tags: [GLOBAL_ARTIFACT_TAG] });
          },
        },
        {
          method: 'put',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: () =>
            exceptionsGenerator.generateBlocklistForUpdate({
              id: blocklistData.artifact.id,
              item_id: blocklistData.artifact.item_id,
              tags: [GLOBAL_ARTIFACT_TAG],
            }),
        },
      ];

      describe('and has authorization to manage endpoint security', () => {
        for (const blocklistApiCall of blocklistApiCalls) {
          it(`should error on [${blocklistApiCall.method}] if invalid condition entry fields are used`, async () => {
            const body = blocklistApiCall.getBody();

            body.entries[0].field = 'some.invalid.field';
            await supertest[blocklistApiCall.method](blocklistApiCall.path)
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

            await supertest[blocklistApiCall.method](blocklistApiCall.path)
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

            await supertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anErrorMessageWith(/Invalid value \"\[\]\"/));
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

            await supertest[blocklistApiCall.method](blocklistApiCall.path)
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

            await supertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/one entry is allowed/));
          });

          it(`should error on [${blocklistApiCall.method}] if more than one OS is set`, async () => {
            const body = blocklistApiCall.getBody();

            body.os_types = ['linux', 'windows'];

            await supertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/\[osTypes\]: array size is \[2\]/));
          });

          it(`should error on [${blocklistApiCall.method}] if policy id is invalid`, async () => {
            const body = blocklistApiCall.getBody();

            body.tags = [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`];

            await supertest[blocklistApiCall.method](blocklistApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid policy ids/));
          });
        }
      });

      describe('and user DOES NOT have authorization to manage endpoint security', () => {
        const allblocklistApiCalls: BlocklistApiCallsInterface = [
          ...blocklistApiCalls,
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
            method: 'delete',
            info: 'single item',
            get path() {
              return `${EXCEPTION_LIST_ITEM_URL}?item_id=${blocklistData.artifact.item_id}&namespace_type=${blocklistData.artifact.namespace_type}`;
            },
            getBody: () => undefined,
          },
          {
            method: 'post',
            info: 'list export',
            get path() {
              return `${EXCEPTION_LIST_URL}/_export?list_id=${blocklistData.artifact.list_id}&namespace_type=${blocklistData.artifact.namespace_type}&id=1`;
            },
            getBody: () => undefined,
          },
          {
            method: 'get',
            info: 'single items',
            get path() {
              return `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${blocklistData.artifact.list_id}&namespace_type=${blocklistData.artifact.namespace_type}&page=1&per_page=1&sort_field=name&sort_order=asc`;
            },
            getBody: () => undefined,
          },
        ];

        for (const blocklistApiCall of allblocklistApiCalls) {
          it(`should error on [${blocklistApiCall.method}]`, async () => {
            await supertestWithoutAuth[blocklistApiCall.method](blocklistApiCall.path)
              .auth(ROLES.detections_admin, 'changeme')
              .set('kbn-xsrf', 'true')
              .send(blocklistApiCall.getBody())
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
