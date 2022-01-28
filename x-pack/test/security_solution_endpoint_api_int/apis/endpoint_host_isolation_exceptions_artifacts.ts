/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../security_solution_endpoint/services/endpoint_policy';
import { ArtifactTestData } from '../../security_solution_endpoint/services/endpoint_artifacts';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../../../plugins/security_solution/common/endpoint/service/artifacts';
import { ExceptionsListItemGenerator } from '../../../plugins/security_solution/common/endpoint/data_generators/exceptions_list_item_generator';
import {
  createUserAndRole,
  deleteUserAndRole,
  ROLES,
} from '../../common/services/security_solution';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');

  type ApiCallsInterface<BodyReturnType = unknown> = Array<{
    method: keyof Pick<typeof supertest, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
    path: string;
    // The body just needs to have the properties we care about in the tests. This should cover most
    // mocks used for testing that support different interfaces
    getBody: () => BodyReturnType;
  }>;

  describe('Endpoint Host Isolation Exceptions artifacts (via lists plugin)', () => {
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
      Pick<ExceptionListItemSchema, 'os_types' | 'tags' | 'entries'>
    > = [
      {
        method: 'post',
        path: EXCEPTION_LIST_ITEM_URL,
        getBody: () => exceptionsGenerator.generateTrustedAppForCreate(),
      },
      {
        method: 'put',
        path: EXCEPTION_LIST_ITEM_URL,
        getBody: () =>
          exceptionsGenerator.generateTrustedAppForUpdate({
            id: existingExceptionData.artifact.id,
            item_id: existingExceptionData.artifact.item_id,
          }),
      },
    ];

    let fleetEndpointPolicy: PolicyTestResourceInfo;
    let existingExceptionData: ArtifactTestData;

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

    beforeEach(async () => {
      existingExceptionData = await endpointArtifactTestResources.createTrustedApp({
        tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}${fleetEndpointPolicy.packagePolicy.id}`],
      });
    });

    afterEach(async () => {
      if (existingExceptionData) {
        await existingExceptionData.cleanup();
      }
    });

    it('should return 400 for import of endpoint exceptions', async () => {
      expect(true).to.be(false);
    });

    describe('and has authorization to manage endpoint security', () => {
      for (const apiCall of apiCalls) {
        it(`should error on [${apiCall.method}] if invalid condition entry fields are used`, async () => {
          const body = apiCall.getBody();

          body.entries[0].field = 'some.invalid.field';

          await supertest[apiCall.method](apiCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/types that failed validation:/));
        });

        it(`should error on [${apiCall.method}] if a condition entry field is used more than once`, async () => {
          const body = apiCall.getBody();

          body.entries.push({ ...body.entries[0] });

          await supertest[apiCall.method](apiCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/Duplicate/));
        });

        it(`should error on [${apiCall.method}] if an invalid hash is used`, async () => {
          const body = apiCall.getBody();

          body.entries = [
            {
              field: 'process.hash.md5',
              operator: 'included',
              type: 'match',
              value: '1',
            },
          ];

          await supertest[apiCall.method](apiCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/invalid hash/));
        });

        it(`should error on [${apiCall.method}] if signer is set for a non windows os entry item`, async () => {
          const body = apiCall.getBody();

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

          await supertest[apiCall.method](apiCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/^.*(?!process\.Ext\.code_signature)/));
        });

        it(`should error on [${apiCall.method}] if more than one OS is set`, async () => {
          const body = apiCall.getBody();

          body.os_types = ['linux', 'windows'];

          await supertest[apiCall.method](apiCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/\[osTypes\]: array size is \[2\]/));
        });

        it(`should error on [${apiCall.method}] if policy id is invalid`, async () => {
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

    describe('and user DOES NOT have authorization to manage endpoint security', () => {
      // Define a new array that includes the prior set from above, plus additional API calls that
      // only have Authz validations setup
      const allTrustedAppApiCalls: ApiCallsInterface = [
        ...apiCalls,
        {
          method: 'get',
          path: `${EXCEPTION_LIST_ITEM_URL}?item_id=${existingExceptionData.artifact.item_id}&namespace_type=${existingExceptionData.artifact.namespace_type}`,
          getBody: () => undefined,
        },
        {
          method: 'get',
          path: `${EXCEPTION_LIST_URL}/summary?list_id=${existingExceptionData.artifact.list_id}&namespace_type=${existingExceptionData.artifact.namespace_type}`,
          getBody: () => undefined,
        },
        {
          method: 'delete',
          path: `${EXCEPTION_LIST_ITEM_URL}?item_id=${existingExceptionData.artifact.item_id}&namespace_type=${existingExceptionData.artifact.namespace_type}`,
          getBody: () => undefined,
        },
        {
          method: 'post',
          path: `${EXCEPTION_LIST_URL}/_export?list_id=${existingExceptionData.artifact.list_id}&namespace_type=${existingExceptionData.artifact.namespace_type}`,
          getBody: () => undefined,
        },
        {
          method: 'get',
          path: `${EXCEPTION_LIST_URL}/_find?list_id=${existingExceptionData.artifact.list_id}&namespace_type=${existingExceptionData.artifact.namespace_type}`,
          getBody: () => undefined,
        },
      ];

      for (const trustedAppApiCall of allTrustedAppApiCalls) {
        it(`should error on [${trustedAppApiCall.method}]`, async () => {
          await supertestWithoutAuth[trustedAppApiCall.method](trustedAppApiCall.path)
            .auth(ROLES.detections_admin, 'changeme')
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
}
