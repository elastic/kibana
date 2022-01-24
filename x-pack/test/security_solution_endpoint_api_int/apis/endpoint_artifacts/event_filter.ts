/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../../security_solution_endpoint/services/endpoint_policy';
import { ArtifactTestData } from '../../../security_solution_endpoint/services/endpoint_artifacts';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../../../../plugins/security_solution/common/endpoint/service/artifacts';
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

  describe('Endpoint artifacts (via lists plugin) event filter', () => {
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

    const exceptionsGenerator = new ExceptionsListItemGenerator();
    let eventFilterData: ArtifactTestData;

    type EventFilterApiCallsInterface = Array<{
      method: keyof Pick<typeof supertest, 'post' | 'put'>;
      path: string;
      // The body just needs to have the properties we care about in the tests. This should cover most
      // mocks used for testing that support different interfaces
      getBody: (
        overrides: Partial<ExceptionListItemSchema>
      ) => Pick<ExceptionListItemSchema, 'os_types' | 'tags' | 'entries'>;
    }>;

    const eventFilterCalls: EventFilterApiCallsInterface = [
      {
        method: 'post',
        path: EXCEPTION_LIST_ITEM_URL,
        getBody: (overrides) =>
          exceptionsGenerator.generateEventFilterForCreate({
            tags: eventFilterData.artifact.tags,
            ...overrides,
          }),
      },
      {
        method: 'put',
        path: EXCEPTION_LIST_ITEM_URL,
        getBody: (overrides) =>
          exceptionsGenerator.generateEventFilterForUpdate({
            id: eventFilterData.artifact.id,
            item_id: eventFilterData.artifact.item_id,
            tags: eventFilterData.artifact.tags,
            _version: eventFilterData.artifact._version,
            ...overrides,
          }),
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

    describe('and has authorization to manage endpoint security', () => {
      for (const eventFilterCall of eventFilterCalls) {
        it(`should error on [${eventFilterCall.method} if invalid field`, async () => {
          const body = eventFilterCall.getBody({});

          body.entries[0].field = 'some.invalid.field';

          await supertest[eventFilterCall.method](eventFilterCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/types that failed validation:/));
        });

        it(`should error on [${eventFilterCall.method}] if more than one OS is set`, async () => {
          const body = eventFilterCall.getBody({ os_types: ['linux', 'windows'] });

          await supertest[eventFilterCall.method](eventFilterCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/\[osTypes\]: array size is \[2\]/));
        });

        it(`should error on [${eventFilterCall.method}] if policy id is invalid`, async () => {
          const body = eventFilterCall.getBody({
            tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`],
          });

          await supertest[eventFilterCall.method](eventFilterCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(400)
            .expect(anEndpointArtifactError)
            .expect(anErrorMessageWith(/invalid policy ids/));
        });

        it(`should work on [${eventFilterCall.method}] with valid entry`, async () => {
          const body = eventFilterCall.getBody({});

          await supertest[eventFilterCall.method](eventFilterCall.path)
            .set('kbn-xsrf', 'true')
            .send(body)
            .expect(200);
        });
      }
    });

    describe('and user DOES NOT have authorization to manage endpoint security', () => {
      for (const eventFilterCall of eventFilterCalls) {
        it(`should 403 on [${eventFilterCall.method}]`, async () => {
          await supertestWithoutAuth[eventFilterCall.method](eventFilterCall.path)
            .auth(ROLES.detections_admin, 'changeme')
            .set('kbn-xsrf', 'true')
            .send(eventFilterCall.getBody({}))
            .expect(403, {
              status_code: 403,
              message: 'EndpointArtifactError: Endpoint authorization failure',
            });
        });
      }
    });
  });
}
