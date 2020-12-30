/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { createHash } from 'crypto';
import { inflateSync } from 'zlib';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getSupertestWithoutAuth } from '../../../fleet_api_integration/apis/agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getSupertestWithoutAuth(providerContext);
  let agentAccessAPIKey: string;

  describe('artifact download', () => {
    before(async () => {
      await esArchiver.load('endpoint/artifacts/api_feature', { useCreate: true });

      const { body: enrollmentApiKeysResponse } = await supertest
        .get(`/api/fleet/enrollment-api-keys`)
        .expect(200);
      expect(enrollmentApiKeysResponse.list).length(2);

      const { body: enrollmentApiKeyResponse } = await supertest
        .get(`/api/fleet/enrollment-api-keys/${enrollmentApiKeysResponse.list[0].id}`)
        .expect(200);
      expect(enrollmentApiKeyResponse.item).to.have.key('api_key');
      const enrollmentAPIToken = enrollmentApiKeyResponse.item.api_key;

      // 2. Enroll agent
      const { body: enrollmentResponse } = await supertestWithoutAuth
        .post(`/api/fleet/agents/enroll`)
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

    it('should fail on invalid api key with 401', async () => {
      await supertestWithoutAuth
        .get(
          '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/1825fb19fcc6dc391cae0bc4a2e96dd7f728a0c3ae9e1469251ada67f9e1b975'
        )
        .set('kbn-xsrf', 'xxx')
        .set('authorization', `ApiKey iNvAlId`)
        .send()
        .expect(401);
    });

    it('should download an artifact with list items', async () => {
      await supertestWithoutAuth
        .get(
          '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/8d2bcc37e82fad5d06e2c9e4bd96793ea8905ace1d528a57d0d0579ecc8c647e'
        )
        .set('kbn-xsrf', 'xxx')
        .set('authorization', `ApiKey ${agentAccessAPIKey}`)
        .send()
        .expect(200)
        .expect((response) => {
          expect(response.body.byteLength).to.equal(191);
          const encodedHash = createHash('sha256').update(response.body).digest('hex');
          expect(encodedHash).to.equal(
            '73015ee5131dabd1b48aa4776d3e766d836f8dd8c9fa8999c9b931f60027f07f'
          );
          const decodedBody = inflateSync(response.body);
          const decodedHash = createHash('sha256').update(decodedBody).digest('hex');
          expect(decodedHash).to.equal(
            '8d2bcc37e82fad5d06e2c9e4bd96793ea8905ace1d528a57d0d0579ecc8c647e'
          );
          expect(decodedBody.byteLength).to.equal(704);
          const artifactJson = JSON.parse(decodedBody.toString());
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
                        value: '😈',
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
              {
                type: 'simple',
                entries: [
                  {
                    field: 'actingProcess.file.signer',
                    operator: 'included',
                    type: 'exact_cased',
                    value: 'Another signer',
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

    it('should download an artifact with unicode characters', async () => {
      await supertestWithoutAuth
        .get(
          '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/8d2bcc37e82fad5d06e2c9e4bd96793ea8905ace1d528a57d0d0579ecc8c647e'
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
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/8d2bcc37e82fad5d06e2c9e4bd96793ea8905ace1d528a57d0d0579ecc8c647e'
            )
            .set('kbn-xsrf', 'xxx')
            .set('authorization', `ApiKey ${agentAccessAPIKey}`)
            .send()
            .expect(200)
            .expect((response) => {
              const encodedHash = createHash('sha256').update(response.body).digest('hex');
              expect(encodedHash).to.equal(
                '73015ee5131dabd1b48aa4776d3e766d836f8dd8c9fa8999c9b931f60027f07f'
              );
              expect(response.body.byteLength).to.equal(191);
              const decodedBody = inflateSync(response.body);
              const decodedHash = createHash('sha256').update(decodedBody).digest('hex');
              expect(decodedHash).to.equal(
                '8d2bcc37e82fad5d06e2c9e4bd96793ea8905ace1d528a57d0d0579ecc8c647e'
              );
              expect(decodedBody.byteLength).to.equal(704);
              const artifactJson = JSON.parse(decodedBody.toString());
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
                            value: '😈',
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
                  {
                    type: 'simple',
                    entries: [
                      {
                        field: 'actingProcess.file.signer',
                        operator: 'included',
                        type: 'exact_cased',
                        value: 'Another signer',
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

    it('should download an artifact with empty exception list', async () => {
      await supertestWithoutAuth
        .get(
          '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658'
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
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658'
            )
            .set('kbn-xsrf', 'xxx')
            .set('authorization', `ApiKey ${agentAccessAPIKey}`)
            .send()
            .expect(200)
            .expect((response) => {
              const encodedHash = createHash('sha256').update(response.body).digest('hex');
              expect(encodedHash).to.equal(
                'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda'
              );
              expect(response.body.byteLength).to.equal(22);
              const decodedBody = inflateSync(response.body);
              const decodedHash = createHash('sha256').update(decodedBody).digest('hex');
              expect(decodedHash).to.equal(
                'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658'
              );
              expect(decodedBody.byteLength).to.equal(14);
              const artifactJson = JSON.parse(decodedBody.toString());
              expect(artifactJson.entries.length).to.equal(0);
            });
        });
    });

    it('should download an artifact from cache', async () => {
      await supertestWithoutAuth
        .get(
          '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/8d2bcc37e82fad5d06e2c9e4bd96793ea8905ace1d528a57d0d0579ecc8c647e'
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
              '/api/endpoint/artifacts/download/endpoint-exceptionlist-windows-v1/8d2bcc37e82fad5d06e2c9e4bd96793ea8905ace1d528a57d0d0579ecc8c647e'
            )
            .set('kbn-xsrf', 'xxx')
            .set('authorization', `ApiKey ${agentAccessAPIKey}`)
            .send()
            .expect(200)
            .expect((response) => {
              expect(response.body.byteLength).to.equal(191);
              const encodedHash = createHash('sha256').update(response.body).digest('hex');
              expect(encodedHash).to.equal(
                '73015ee5131dabd1b48aa4776d3e766d836f8dd8c9fa8999c9b931f60027f07f'
              );
              const decodedBody = inflateSync(response.body);
              const decodedHash = createHash('sha256').update(decodedBody).digest('hex');
              expect(decodedHash).to.equal(
                '8d2bcc37e82fad5d06e2c9e4bd96793ea8905ace1d528a57d0d0579ecc8c647e'
              );
              expect(decodedBody.byteLength).to.equal(704);
              const artifactJson = JSON.parse(decodedBody.toString());
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
                            value: '😈',
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
                  {
                    type: 'simple',
                    entries: [
                      {
                        field: 'actingProcess.file.signer',
                        operator: 'included',
                        type: 'exact_cased',
                        value: 'Another signer',
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
  });
}
