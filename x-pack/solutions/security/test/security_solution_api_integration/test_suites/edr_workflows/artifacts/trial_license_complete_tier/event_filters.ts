/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import expect from '@kbn/expect';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import { ExceptionsListItemGenerator } from '@kbn/security-solution-plugin/common/endpoint/data_generators/exceptions_list_item_generator';
import {
  getImportExceptionsListSchemaMock,
  toNdJsonString,
} from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';
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
  // FLAKY: https://github.com/elastic/kibana/issues/248923
  describe.skip('@ess @serverless @skipInServerlessMKI Endpoint artifacts (via lists plugin): Event Filters', function () {
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

    const exceptionsGenerator = new ExceptionsListItemGenerator();
    let eventFilterData: ArtifactTestData;

    type UnknownBodyGetter = () => unknown;
    type PutPostBodyGetter = (
      overrides?: Partial<ExceptionListItemSchema>
    ) => Pick<
      ExceptionListItemSchema,
      'item_id' | 'namespace_type' | 'os_types' | 'tags' | 'entries'
    >;

    type EventFilterApiCallsInterface<BodyGetter = UnknownBodyGetter> = Array<{
      method: keyof Pick<TestAgent, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
      info?: string;
      path: string;
      // The body just needs to have the properties we care about in the tests. This should cover most
      // mocks used for testing that support different interfaces
      getBody: BodyGetter;
    }>;

    const eventFilterCalls: EventFilterApiCallsInterface<PutPostBodyGetter> = [
      {
        method: 'post',
        info: 'create single item',
        path: EXCEPTION_LIST_ITEM_URL,
        getBody: (overrides = {}) =>
          exceptionsGenerator.generateEventFilterForCreate({
            tags: eventFilterData.artifact.tags,
            ...overrides,
          }),
      },
      {
        method: 'put',
        info: 'update single item',
        path: EXCEPTION_LIST_ITEM_URL,
        getBody: (overrides = {}) =>
          exceptionsGenerator.generateEventFilterForUpdate({
            id: eventFilterData.artifact.id,
            item_id: eventFilterData.artifact.item_id,
            tags: eventFilterData.artifact.tags,
            _version: eventFilterData.artifact._version,
            ...overrides,
          }),
      },
    ];

    const needsWritePrivilege: EventFilterApiCallsInterface = [
      {
        method: 'delete',
        info: 'delete single item',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}?item_id=${eventFilterData.artifact.item_id}&namespace_type=${eventFilterData.artifact.namespace_type}`;
        },
        getBody: () => undefined,
      },
    ];

    const needsReadPrivilege: EventFilterApiCallsInterface = [
      {
        method: 'get',
        info: 'single item',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}?item_id=${eventFilterData.artifact.item_id}&namespace_type=${eventFilterData.artifact.namespace_type}`;
        },
        getBody: () => undefined,
      },
      {
        method: 'get',
        info: 'list summary',
        get path() {
          return `${EXCEPTION_LIST_URL}/summary?list_id=${eventFilterData.artifact.list_id}&namespace_type=${eventFilterData.artifact.namespace_type}`;
        },
        getBody: () => undefined,
      },
      {
        method: 'get',
        info: 'find items',
        get path() {
          return `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${eventFilterData.artifact.list_id}&namespace_type=${eventFilterData.artifact.namespace_type}&page=1&per_page=1&sort_field=name&sort_order=asc`;
        },
        getBody: () => undefined,
      },
      {
        method: 'post',
        info: 'list export',
        get path() {
          return `${EXCEPTION_LIST_URL}/_export?list_id=${eventFilterData.artifact.list_id}&namespace_type=${eventFilterData.artifact.namespace_type}&id=${eventFilterData.artifact.id}&include_expired_exceptions=true`;
        },
        getBody: () => undefined,
      },
    ];

    beforeEach(async () => {
      eventFilterData = await endpointArtifactTestResources.createEventFilter({
        tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}${fleetEndpointPolicy.packagePolicy.id}`],
      });
    });

    afterEach(async () => {
      if (eventFilterData) {
        await eventFilterData.cleanup();
      }
    });

    it('should return 400 for import of endpoint exceptions', async () => {
      await endpointPolicyManagerSupertest
        .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
        .set('kbn-xsrf', 'true')
        .attach(
          'file',
          Buffer.from(
            toNdJsonString([getImportExceptionsListSchemaMock(eventFilterData.artifact.list_id)])
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
      for (const eventFilterApiCall of eventFilterCalls) {
        it(`should error on [${eventFilterApiCall.method}] if more than one OS is set`, async () => {
          const body = eventFilterApiCall.getBody({ os_types: ['linux', 'windows'] });

          await endpointPolicyManagerSupertest[eventFilterApiCall.method](eventFilterApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/\[osTypes\]: array size is \[2\]/));
        });

        it(`should error on [${eventFilterApiCall.method}] if policy id is invalid`, async () => {
          const body = eventFilterApiCall.getBody({
            tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`],
          });

          // Using superuser there as we need custom license for this action
          await endpointPolicyManagerSupertest[eventFilterApiCall.method](eventFilterApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/invalid policy ids/));
        });

        it(`should work on [${eventFilterApiCall.method}] with valid entry`, async () => {
          const body = eventFilterApiCall.getBody({});

          // Using superuser here as we need custom license for this action
          await endpointPolicyManagerSupertest[eventFilterApiCall.method](eventFilterApiCall.path)
            .auth(ROLE.endpoint_policy_manager, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(200);

          const deleteUrl = `${EXCEPTION_LIST_ITEM_URL}?item_id=${body.item_id}&namespace_type=${body.namespace_type}`;
          await endpointPolicyManagerSupertest.delete(deleteUrl).set('kbn-xsrf', 'true');
        });
      }
      for (const eventFilterApiCall of [...needsWritePrivilege, ...needsReadPrivilege]) {
        it(`should not error on [${eventFilterApiCall.method}] - [${eventFilterApiCall.info}]`, async () => {
          await endpointPolicyManagerSupertest[eventFilterApiCall.method](eventFilterApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(eventFilterApiCall.getBody() as object)
            .expect(200);
        });
      }
    });

    describe('@skipInServerless and user has authorization to read event filters', function () {
      let hunterSupertest: TestAgent;
      before(async () => {
        hunterSupertest = await utils.createSuperTest(ROLE.hunter);
      });
      for (const eventFilterApiCall of [...eventFilterCalls, ...needsWritePrivilege]) {
        it(`should error on [${eventFilterApiCall.method}] - [${eventFilterApiCall.info}]`, async () => {
          await hunterSupertest[eventFilterApiCall.method](eventFilterApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(eventFilterApiCall.getBody() as object)
            .expect(403);
        });
      }

      for (const eventFilterApiCall of needsReadPrivilege) {
        it(`should not error on [${eventFilterApiCall.method}] - [${eventFilterApiCall.info}]`, async () => {
          await hunterSupertest[eventFilterApiCall.method](eventFilterApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(eventFilterApiCall.getBody() as object)
            .expect(200);
        });
      }
    });

    describe('and user has no authorization to event filters', () => {
      for (const eventFilterApiCall of [
        ...eventFilterCalls,
        ...needsWritePrivilege,
        ...needsReadPrivilege,
      ]) {
        it(`should error on [${eventFilterApiCall.method}] - [${eventFilterApiCall.info}]`, async () => {
          await t1AnalystSupertest[eventFilterApiCall.method](eventFilterApiCall.path)
            .set('kbn-xsrf', 'true')
            .send(eventFilterApiCall.getBody() as object)
            .expect(403);
        });
      }
    });
  });
}
