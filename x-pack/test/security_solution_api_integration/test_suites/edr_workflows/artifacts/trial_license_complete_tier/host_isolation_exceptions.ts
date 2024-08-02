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
import {
  getImportExceptionsListSchemaMock,
  toNdJsonString,
} from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import { PolicyTestResourceInfo } from '../../../../../security_solution_endpoint/services/endpoint_policy';
import { ArtifactTestData } from '../../../../../security_solution_endpoint/services/endpoint_artifacts';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');

  // @skipInServerlessMKI due to authentication issues - we should migrate from Basic to Bearer token when available
  // @skipInServerlessMKI - if you are removing this annotation, make sure to add the test suite to the MKI pipeline in .buildkite/pipelines/security_solution_quality_gate/mki_periodic/mki_periodic_defend_workflows.yml
  describe('@ess @serverless @skipInServerlessMKI Endpoint Host Isolation Exceptions artifacts (via lists plugin)', function () {
    let fleetEndpointPolicy: PolicyTestResourceInfo;
    let hostIsolationExceptionData: ArtifactTestData;

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
    type UnknownBodyGetter = () => unknown;
    type PutPostBodyGetter = (
      overrides?: Partial<ExceptionListItemSchema>
    ) => Pick<
      ExceptionListItemSchema,
      'item_id' | 'namespace_type' | 'os_types' | 'tags' | 'entries'
    >;
    type HostIsolationExceptionApiCallsInterface<BodyGetter = UnknownBodyGetter> = Array<{
      method: keyof Pick<typeof supertest, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
      info?: string;
      path: string;
      // The body just needs to have the properties we care about in the tests. This should cover most
      // mocks used for testing that support different interfaces
      getBody: BodyGetter;
    }>;

    const hostIsolationExceptionCalls: HostIsolationExceptionApiCallsInterface<PutPostBodyGetter> =
      [
        {
          method: 'post',
          info: 'create single item',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: () =>
            exceptionsGenerator.generateHostIsolationExceptionForCreate({
              tags: [GLOBAL_ARTIFACT_TAG],
            }),
        },
        {
          method: 'put',
          info: 'update single item',
          path: EXCEPTION_LIST_ITEM_URL,
          getBody: () =>
            exceptionsGenerator.generateHostIsolationExceptionForUpdate({
              id: hostIsolationExceptionData.artifact.id,
              item_id: hostIsolationExceptionData.artifact.item_id,
              _version: hostIsolationExceptionData.artifact._version,
              tags: [GLOBAL_ARTIFACT_TAG],
            }),
        },
      ];

    const needsWritePrivilege: HostIsolationExceptionApiCallsInterface = [
      {
        method: 'delete',
        info: 'delete single item',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}?item_id=${hostIsolationExceptionData.artifact.item_id}&namespace_type=${hostIsolationExceptionData.artifact.namespace_type}`;
        },
        getBody: () => undefined,
      },
    ];

    const needsReadPrivilege: HostIsolationExceptionApiCallsInterface = [
      {
        method: 'get',
        info: 'single item',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}?item_id=${hostIsolationExceptionData.artifact.item_id}&namespace_type=${hostIsolationExceptionData.artifact.namespace_type}`;
        },
        getBody: () => undefined,
      },
      {
        method: 'get',
        info: 'list summary',
        get path() {
          return `${EXCEPTION_LIST_URL}/summary?list_id=${hostIsolationExceptionData.artifact.list_id}&namespace_type=${hostIsolationExceptionData.artifact.namespace_type}`;
        },
        getBody: () => undefined,
      },
      {
        method: 'get',
        info: 'find items',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${hostIsolationExceptionData.artifact.list_id}&namespace_type=${hostIsolationExceptionData.artifact.namespace_type}&page=1&per_page=1&sort_field=name&sort_order=asc`;
        },
        getBody: () => undefined,
      },
      {
        method: 'post',
        info: 'list export',
        get path() {
          return `${EXCEPTION_LIST_URL}/_export?list_id=${hostIsolationExceptionData.artifact.list_id}&namespace_type=${hostIsolationExceptionData.artifact.namespace_type}&id=${hostIsolationExceptionData.artifact.id}&include_expired_exceptions=true`;
        },
        getBody: () => undefined,
      },
    ];

    before(async () => {
      // Create an endpoint policy in fleet we can work with
      fleetEndpointPolicy = await endpointPolicyTestResources.createPolicy();
    });

    after(async () => {
      if (fleetEndpointPolicy) {
        await fleetEndpointPolicy.cleanup();
      }
    });

    beforeEach(async () => {
      hostIsolationExceptionData = await endpointArtifactTestResources.createHostIsolationException(
        {
          tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}${fleetEndpointPolicy.packagePolicy.id}`],
        }
      );
    });

    afterEach(async () => {
      if (hostIsolationExceptionData) {
        await hostIsolationExceptionData.cleanup();
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
              getImportExceptionsListSchemaMock(hostIsolationExceptionData.artifact.list_id),
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
      for (const hostIsolationExceptionApiCall of hostIsolationExceptionCalls) {
        it(`[${hostIsolationExceptionApiCall.method}] if invalid condition entry fields are used`, async () => {
          const body = hostIsolationExceptionApiCall.getBody();

          body.entries[0].field = 'some.invalid.field';

          await supertestWithoutAuth[hostIsolationExceptionApiCall.method](
            hostIsolationExceptionApiCall.path
          )
            .auth(ROLE.endpoint_policy_manager, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/expected value to equal \[destination.ip\]/));
        });

        it(`[${hostIsolationExceptionApiCall.method}] if more than one entry`, async () => {
          const body = hostIsolationExceptionApiCall.getBody();

          body.entries.push({ ...body.entries[0] });

          await supertestWithoutAuth[hostIsolationExceptionApiCall.method](
            hostIsolationExceptionApiCall.path
          )
            .auth(ROLE.endpoint_policy_manager, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/\[entries\]: array size is \[2\]/));
        });

        it(`[${hostIsolationExceptionApiCall.method}] if an invalid ip is used`, async () => {
          const body = hostIsolationExceptionApiCall.getBody();

          body.entries = [
            {
              field: 'destination.ip',
              operator: 'included',
              type: 'match',
              value: 'not.an.ip',
            },
          ];

          await supertestWithoutAuth[hostIsolationExceptionApiCall.method](
            hostIsolationExceptionApiCall.path
          )
            .auth(ROLE.endpoint_policy_manager, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/invalid ip/));
        });

        it(`[${hostIsolationExceptionApiCall.method}] if all OSs for os_types are not included`, async () => {
          const body = hostIsolationExceptionApiCall.getBody();

          body.os_types = ['linux', 'windows'];

          await supertestWithoutAuth[hostIsolationExceptionApiCall.method](
            hostIsolationExceptionApiCall.path
          )
            .auth(ROLE.endpoint_policy_manager, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/\[osTypes\]: array size is \[2\]/));
        });

        it(`[${hostIsolationExceptionApiCall.method}] if policy id is invalid`, async () => {
          const body = hostIsolationExceptionApiCall.getBody();

          body.tags = [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`];

          // Using superuser here as we need custom license for this action
          await supertest[hostIsolationExceptionApiCall.method](hostIsolationExceptionApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/invalid policy ids/));
        });
      }
      for (const hostIsolationExceptionApiCall of [...needsWritePrivilege, ...needsReadPrivilege]) {
        it(`should not error on [${hostIsolationExceptionApiCall.method}] - [${hostIsolationExceptionApiCall.info}]`, async () => {
          await supertestWithoutAuth[hostIsolationExceptionApiCall.method](
            hostIsolationExceptionApiCall.path
          )
            .auth(ROLE.endpoint_policy_manager, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(hostIsolationExceptionApiCall.getBody() as object)
            .expect(200);
        });
      }
    });

    // no such role in serverless
    describe('@skipInServerless and user has authorization to read host isolation exceptions', function () {
      for (const hostIsolationExceptionApiCall of [
        ...hostIsolationExceptionCalls,
        ...needsWritePrivilege,
      ]) {
        it(`should error on [${hostIsolationExceptionApiCall.method}] - [${hostIsolationExceptionApiCall.info}]`, async () => {
          await supertestWithoutAuth[hostIsolationExceptionApiCall.method](
            hostIsolationExceptionApiCall.path
          )
            .auth(ROLE.hunter, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(hostIsolationExceptionApiCall.getBody() as object)
            .expect(403);
        });
      }

      for (const hostIsolationExceptionApiCall of needsReadPrivilege) {
        it(`should not error on [${hostIsolationExceptionApiCall.method}] - [${hostIsolationExceptionApiCall.info}]`, async () => {
          await supertestWithoutAuth[hostIsolationExceptionApiCall.method](
            hostIsolationExceptionApiCall.path
          )
            .auth(ROLE.hunter, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(hostIsolationExceptionApiCall.getBody() as object)
            .expect(200);
        });
      }
    });

    describe('and user has no authorization to host isolation exceptions', () => {
      for (const hostIsolationExceptionApiCall of [
        ...hostIsolationExceptionCalls,
        ...needsWritePrivilege,
        ...needsReadPrivilege,
      ]) {
        it(`should error on [${hostIsolationExceptionApiCall.method}] - [${hostIsolationExceptionApiCall.info}]`, async () => {
          await supertestWithoutAuth[hostIsolationExceptionApiCall.method](
            hostIsolationExceptionApiCall.path
          )
            .auth(ROLE.t1_analyst, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(hostIsolationExceptionApiCall.getBody() as object)
            .expect(403);
        });
      }
    });
  });
}
