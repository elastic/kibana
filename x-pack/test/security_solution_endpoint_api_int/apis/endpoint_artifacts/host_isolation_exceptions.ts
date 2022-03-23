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
import { ArtifactTestData } from '../../../security_solution_endpoint/services/endpoint_artifacts';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  GLOBAL_ARTIFACT_TAG,
} from '../../../../plugins/security_solution/common/endpoint/service/artifacts';
import {
  createUserAndRole,
  deleteUserAndRole,
  ROLES,
} from '../../../common/services/security_solution';
import {
  getImportExceptionsListSchemaMock,
  toNdJsonString,
} from '../../../../plugins/lists/common/schemas/request/import_exceptions_schema.mock';
import { ExceptionsListItemGenerator } from '../../../../plugins/security_solution/common/endpoint/data_generators/exceptions_list_item_generator';

export default function ({ getService }: FtrProviderContext) {
  const USER = ROLES.detections_admin;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');
  const log = getService('log');

  type ApiCallsInterface<BodyReturnType = unknown> = Array<{
    method: keyof Pick<typeof supertest, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
    info?: string;
    path: string;
    // The body just needs to have the properties we care about in the tests. This should cover most
    // mocks used for testing that support different interfaces
    getBody: () => BodyReturnType;
  }>;

  describe('Endpoint Host Isolation Exceptions artifacts (via lists plugin)', () => {
    let fleetEndpointPolicy: PolicyTestResourceInfo;
    let existingExceptionData: ArtifactTestData;

    const exceptionsGenerator = new ExceptionsListItemGenerator();

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

    const apiCalls: ApiCallsInterface<
      Pick<ExceptionListItemSchema, 'item_id' | 'namespace_type' | 'os_types' | 'tags' | 'entries'>
    > = [
      {
        method: 'post',
        path: EXCEPTION_LIST_ITEM_URL,
        getBody: () =>
          exceptionsGenerator.generateHostIsolationExceptionForCreate({
            tags: [GLOBAL_ARTIFACT_TAG],
          }),
      },
      {
        method: 'put',
        path: EXCEPTION_LIST_ITEM_URL,
        getBody: () =>
          exceptionsGenerator.generateHostIsolationExceptionForUpdate({
            id: existingExceptionData.artifact.id,
            item_id: existingExceptionData.artifact.item_id,
            _version: existingExceptionData.artifact._version,
            tags: [GLOBAL_ARTIFACT_TAG],
          }),
      },
    ];

    before(async () => {
      // Create an endpoint policy in fleet we can work with
      fleetEndpointPolicy = await endpointPolicyTestResources.createPolicy();

      // create role/user
      await createUserAndRole(getService, USER);
    });

    after(async () => {
      if (fleetEndpointPolicy) {
        await fleetEndpointPolicy.cleanup();
      }

      // delete role/user
      await deleteUserAndRole(getService, USER);
    });

    beforeEach(async () => {
      existingExceptionData = await endpointArtifactTestResources.createHostIsolationException({
        tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}${fleetEndpointPolicy.packagePolicy.id}`],
      });
    });

    afterEach(async () => {
      if (existingExceptionData) {
        await existingExceptionData.cleanup();
      }
    });

    it('should return 400 for import of endpoint exceptions', async () => {
      await supertest
        .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
        .set('kbn-xsrf', 'true')
        .attach(
          'file',
          Buffer.from(
            toNdJsonString([
              getImportExceptionsListSchemaMock(existingExceptionData.artifact.list_id),
            ])
          ),
          'exceptions.ndjson'
        )
        .expect(400, {
          status_code: 400,
          message:
            'EndpointArtifactError: Import is not supported for Endpoint artifact exceptions',
        });
    });

    describe('and has authorization to manage endpoint security', () => {
      describe('should error on ', () => {
        for (const apiCall of apiCalls) {
          it(`[${apiCall.method}] if invalid condition entry fields are used`, async () => {
            const body = apiCall.getBody();

            body.entries[0].field = 'some.invalid.field';

            await supertest[apiCall.method](apiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/expected value to equal \[destination.ip\]/));
          });

          it(`[${apiCall.method}] if more than one entry`, async () => {
            const body = apiCall.getBody();

            body.entries.push({ ...body.entries[0] });

            await supertest[apiCall.method](apiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/\[entries\]: array size is \[2\]/));
          });

          it(`[${apiCall.method}] if an invalid ip is used`, async () => {
            const body = apiCall.getBody();

            body.entries = [
              {
                field: 'destination.ip',
                operator: 'included',
                type: 'match',
                value: 'not.an.ip',
              },
            ];

            await supertest[apiCall.method](apiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid ip/));
          });

          it(`[${apiCall.method}] if all OSs for os_types are not included`, async () => {
            const body = apiCall.getBody();

            body.os_types = ['linux', 'windows'];

            await supertest[apiCall.method](apiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/\[osTypes\]: array size is \[2\]/));
          });

          it(`[${apiCall.method}] if policy id is invalid`, async () => {
            const body = apiCall.getBody();

            body.tags = [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`];

            await supertest[apiCall.method](apiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid policy ids/));
          });
        }
      });

      describe('should work on ', () => {
        for (const apiCall of apiCalls) {
          it(`[${apiCall.method}] if entry is valid`, async () => {
            const body = apiCall.getBody();

            await supertest[apiCall.method](apiCall.path)
              .set('kbn-xsrf', 'true')
              .on('error', (error) => {
                log.error(JSON.stringify(error?.response?.body ?? error, null, 2));
              })
              .send(body)
              .expect(200);

            const deleteUrl = `${EXCEPTION_LIST_ITEM_URL}?item_id=${body.item_id}&namespace_type=${body.namespace_type}`;

            log.info(`cleaning up: ${deleteUrl}`);

            await supertest.delete(deleteUrl).set('kbn-xsrf', 'true').expect(200);
          });
        }
      });
    });

    describe(`and user (${USER}) DOES NOT have authorization to manage endpoint security`, () => {
      // Define a new array that includes the prior set from above, plus additional API calls that
      // only have Authz validations setup
      const allApiCalls: ApiCallsInterface = [
        ...apiCalls,
        {
          method: 'get',
          info: 'single item',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}?item_id=${existingExceptionData.artifact.item_id}&namespace_type=${existingExceptionData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'get',
          info: 'list summary',
          get path() {
            return `${EXCEPTION_LIST_URL}/summary?list_id=${existingExceptionData.artifact.list_id}&namespace_type=${existingExceptionData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'delete',
          info: 'single item',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}?item_id=${existingExceptionData.artifact.item_id}&namespace_type=${existingExceptionData.artifact.namespace_type}`;
          },
          getBody: () => undefined,
        },
        {
          method: 'post',
          info: 'list export',
          get path() {
            return `${EXCEPTION_LIST_URL}/_export?list_id=${existingExceptionData.artifact.list_id}&namespace_type=${existingExceptionData.artifact.namespace_type}&id=1`;
          },
          getBody: () => undefined,
        },
        {
          method: 'get',
          info: 'find items',
          get path() {
            return `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${existingExceptionData.artifact.list_id}&namespace_type=${existingExceptionData.artifact.namespace_type}&page=1&per_page=1&sort_field=name&sort_order=asc`;
          },
          getBody: () => undefined,
        },
      ];

      for (const apiCall of allApiCalls) {
        it(`should error on [${apiCall.method}]${
          apiCall.info ? ` ${apiCall.info}` : ''
        }`, async () => {
          await supertestWithoutAuth[apiCall.method](apiCall.path)
            .auth(ROLES.detections_admin, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(apiCall.getBody())
            .expect(403, {
              status_code: 403,
              message: 'EndpointArtifactError: Endpoint authorization failure',
            });
        });
      }
    });
  });
}
