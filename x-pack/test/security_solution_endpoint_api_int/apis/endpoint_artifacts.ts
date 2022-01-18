/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import { PolicyTestResourceInfo } from '../../security_solution_endpoint/services/endpoint_policy';
import { ArtifactTestData } from '../../security_solution_endpoint/services/endpoint_artifacts';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../../../plugins/security_solution/common/endpoint/service/artifacts';
import { ExceptionsListItemGenerator } from '../../../plugins/security_solution/common/endpoint/data_generators/exceptions_list_item_generator';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const endpointPolicyTestResources = getService('endpointPolicyTestResources');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');

  describe('Endpoint artifacts (via lists plugin)', () => {
    let fleetEndpointPolicy: PolicyTestResourceInfo;

    before(async () => {
      // Create an endpoint policy in fleet we can work with
      fleetEndpointPolicy = await endpointPolicyTestResources.createPolicy();
    });

    after(async () => {
      if (fleetEndpointPolicy) {
        await fleetEndpointPolicy.cleanup();
      }
    });

    describe('and has authorization to manage endpoint security', () => {
      describe('and creating or updating rusted apps', () => {
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

        let trustedAppData: ArtifactTestData;

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

        type TrustedAppApiCallsInterface = Array<{
          method: keyof Pick<typeof supertest, 'post' | 'put' | 'get' | 'delete' | 'patch'>;
          path: string;
          getBody: () => Pick<ExceptionListItemSchema, 'os_types' | 'tags' | 'entries'>;
        }>;

        const trustedAppApiCalls: TrustedAppApiCallsInterface = [
          {
            method: 'post',
            path: EXCEPTION_LIST_ITEM_URL,
            getBody: () => exceptionsGenerator.generateTrustedAppForCreate(),
          },
          {
            method: 'put',
            path: EXCEPTION_LIST_ITEM_URL,
            getBody: () => ({
              id: trustedAppData.artifact.id,
              item_id: trustedAppData.artifact.item_id,
            }),
          },
        ];

        for (const trustedAppApiCall of trustedAppApiCalls) {
          it(`should error on [${trustedAppApiCall.method}] if invalid condition entry fields are used`, async () => {
            const body = trustedAppApiCall.getBody();

            body.entries[0].field = 'some.invalid.field';

            await supertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/\[entries\.0\.field\]\: types that failed validation/));
          });

          it(`should error on [${trustedAppApiCall.method}] if a condition entry field is used more than once`, async () => {
            const body = trustedAppApiCall.getBody();

            body.entries.push({ ...body.entries[0] });

            await supertest[trustedAppApiCall.method](trustedAppApiCall.path)
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

            await supertest[trustedAppApiCall.method](trustedAppApiCall.path)
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

            await supertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/^.*(?!process\.Ext\.code_signature)/));
          });

          it(`should error on [${trustedAppApiCall.method}] if more than one OS is set`, async () => {
            const body = trustedAppApiCall.getBody();

            body.os_types = ['linux', 'windows'];

            await supertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/\[osTypes\]: array size is \[2\]/));
          });

          it(`should error on [${trustedAppApiCall.method}] if policy id is invalid`, async () => {
            const body = trustedAppApiCall.getBody();

            body.tags = [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`];

            await supertest[trustedAppApiCall.method](trustedAppApiCall.path)
              .set('kbn-xsrf', 'true')
              .send(body)
              .expect(400)
              .expect(anEndpointArtifactError)
              .expect(anErrorMessageWith(/invalid policy ids/));
          });
        }

        describe('and elastic license is less than Platinum Plus', () => {
          it('should error on [${trustedAppApiCall.method}] if attempting to modify policy id');

          it('should error on [${trustedAppApiCall.method}] if attempting to remove policy id');

          it(
            'should allow update on [${trustedAppApiCall.method}] to global artifact (from policy specific'
          );
        });
      });
    });

    describe('and user is NOT authorized to manage endpoint security', () => {
      describe('and attempting to access Trusted apps', () => {
        it('should error if on create');

        it('should error update');
      });
    });
  });
}
