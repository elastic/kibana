/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { inflateSync } from 'zlib';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { getSupertestWithoutAuth, setupIngest } from '../../fleet/agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getSupertestWithoutAuth(providerContext);
  let agentAccessAPIKey: string;

  describe('artifact download', () => {
    setupIngest(providerContext);
    before(async () => {
      await esArchiver.load('endpoint/artifacts/api_feature', { useCreate: true });

      const { body: enrollmentApiKeysResponse } = await supertest
        .get(`/api/ingest_manager/fleet/enrollment-api-keys`)
        .expect(200);
      expect(enrollmentApiKeysResponse.list).length(2);

      const { body: enrollmentApiKeyResponse } = await supertest
        .get(
          `/api/ingest_manager/fleet/enrollment-api-keys/${enrollmentApiKeysResponse.list[0].id}`
        )
        .expect(200);
      expect(enrollmentApiKeyResponse.item).to.have.key('api_key');
      const enrollmentAPIToken = enrollmentApiKeyResponse.item.api_key;

      // 2. Enroll agent
      const { body: enrollmentResponse } = await supertestWithoutAuth
        .post(`/api/ingest_manager/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `ApiKey ${enrollmentAPIToken}`)
        .send({
          type: 'PERMANENT',
          metadata: {
            local: {
              elastic: {
                agent: {
                  version: '7.0.0',
                },
              },
            },
            user_provided: {},
          },
        })
        .expect(200);
      expect(enrollmentResponse.success).to.eql(true);

      agentAccessAPIKey = enrollmentResponse.item.access_api_key;
    });
    after(() => esArchiver.unload('endpoint/artifacts/api_feature'));

    it('should fail to find artifact with invalid hash', async () => {
      await supertestWithoutAuth
        .get('/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/abcd')
        .set('kbn-xsrf', 'xxx')
        .set('authorization', `ApiKey ${agentAccessAPIKey}`)
        .send()
        .expect(404);
    });

    it('should download an artifact with correct hash', async () => {
      await supertestWithoutAuth
        .get(
          '/api/endpoint/artifacts/download/endpoint-exceptionlist-linux-v1/d2a9c760005b08d43394e59a8701ae75c80881934ccf15a006944452b80f7f9f'
        )
        .set('kbn-xsrf', 'xxx')
        .set('authorization', `ApiKey ${agentAccessAPIKey}`)
        .send()
        .expect(200)
        .expect((response) => {
          const artifactJson = JSON.parse(inflateSync(response.body).toString());
          expect(artifactJson).to.eql({
            entries: [
              {
                type: 'simple',
                entries: [
                  {
                    field: 'actingProcess.file.signer',
                    operator: 'included',
                    type: 'exact_cased',
                    value: 'Elastic, N.V.',
                  },
                  {
                    entries: [
                      {
                        field: 'signer',
                        operator: 'included',
                        type: 'exact_cased',
                        value: 'Evil',
                      },
                      {
                        field: 'trusted',
                        operator: 'included',
                        type: 'exact_cased',
                        value: 'true',
                      },
                    ],
                    field: 'file.signature',
                    type: 'nested',
                  },
                ],
              },
            ],
          });
        });
    });

    it('should download an artifact with correct hash from cache', async () => {
      await supertestWithoutAuth
        .get(
          '/api/endpoint/artifacts/download/endpoint-exceptionlist-linux-v1/d2a9c760005b08d43394e59a8701ae75c80881934ccf15a006944452b80f7f9f'
        )
        .set('kbn-xsrf', 'xxx')
        .set('authorization', `ApiKey ${agentAccessAPIKey}`)
        .send()
        .expect(200)
        .expect((response) => {
          JSON.parse(inflateSync(response.body).toString());
        })
        .then(async () => {
          await supertestWithoutAuth
            .get(
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-linux-v1/d2a9c760005b08d43394e59a8701ae75c80881934ccf15a006944452b80f7f9f'
            )
            .set('kbn-xsrf', 'xxx')
            .set('authorization', `ApiKey ${agentAccessAPIKey}`)
            .send()
            .expect(200)
            .expect((response) => {
              const artifactJson = JSON.parse(inflateSync(response.body).toString());
              expect(artifactJson).to.eql({
                entries: [
                  {
                    type: 'simple',
                    entries: [
                      {
                        field: 'actingProcess.file.signer',
                        operator: 'included',
                        type: 'exact_cased',
                        value: 'Elastic, N.V.',
                      },
                      {
                        entries: [
                          {
                            field: 'signer',
                            operator: 'included',
                            type: 'exact_cased',
                            value: 'Evil',
                          },
                          {
                            field: 'trusted',
                            operator: 'included',
                            type: 'exact_cased',
                            value: 'true',
                          },
                        ],
                        field: 'file.signature',
                        type: 'nested',
                      },
                    ],
                  },
                ],
              });
            });
        });
    });

    it('should fail on invalid api key', async () => {
      await supertestWithoutAuth
        .get(
          '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/1825fb19fcc6dc391cae0bc4a2e96dd7f728a0c3ae9e1469251ada67f9e1b975'
        )
        .set('kbn-xsrf', 'xxx')
        .set('authorization', `ApiKey iNvAlId`)
        .send()
        .expect(401);
    });
  });
}
