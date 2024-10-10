/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import request from 'superagent';
import { inflateResponse } from '@kbn/bfetch-plugin/public/streaming';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { BFETCH_ROUTE_VERSION_LATEST } from '@kbn/bfetch-plugin/common';
import { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { painlessErrReq } from './painless_err_req';
import { verifyErrorResponse } from './verify_error';

function parseBfetchResponse(resp: request.Response, compressed: boolean = false) {
  return resp.text
    .trim()
    .split('\n')
    .map((item) => {
      return JSON.parse(compressed ? inflateResponse<any>(item) : item);
    });
}

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;

  describe('bsearch', () => {
    before(async () => {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
          withCustomHeaders: {
            [ELASTIC_HTTP_VERSION_HEADER]: BFETCH_ROUTE_VERSION_LATEST,
          },
        }
      );
    });

    describe('post', () => {
      it('should return 200 a single response', async () => {
        const resp = await supertestAdminWithCookieCredentials.post(`/internal/bsearch`).send({
          batch: [
            {
              request: {
                params: {
                  index: '.kibana',
                  body: {
                    query: {
                      match_all: {},
                    },
                  },
                },
              },
              options: {
                strategy: 'es',
              },
            },
          ],
        });

        const jsonBody = parseBfetchResponse(resp);

        expect(resp.status).to.be(200);
        expect(jsonBody[0].id).to.be(0);
        expect(jsonBody[0].result.isPartial).to.be(false);
        expect(jsonBody[0].result.isRunning).to.be(false);
        expect(jsonBody[0].result).to.have.property('rawResponse');
      });

      it('should return 200 a single response from compressed', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .post(`/internal/bsearch?compress=true`)
          .send({
            batch: [
              {
                request: {
                  params: {
                    index: '.kibana',
                    body: {
                      query: {
                        match_all: {},
                      },
                    },
                  },
                },
                options: {
                  strategy: 'es',
                },
              },
            ],
          });

        const jsonBody = parseBfetchResponse(resp, true);

        expect(resp.status).to.be(200);
        expect(jsonBody[0].id).to.be(0);
        expect(jsonBody[0].result.isPartial).to.be(false);
        expect(jsonBody[0].result.isRunning).to.be(false);
        expect(jsonBody[0].result).to.have.property('rawResponse');
      });

      it('should return a batch of successful responses', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .post(`/internal/bsearch`)
          .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
          .send({
            batch: [
              {
                request: {
                  params: {
                    index: '.kibana',
                    body: {
                      query: {
                        match_all: {},
                      },
                    },
                  },
                },
              },
              {
                request: {
                  params: {
                    index: '.kibana',
                    body: {
                      query: {
                        match_all: {},
                      },
                    },
                  },
                },
              },
            ],
          });

        expect(resp.status).to.be(200);
        const parsedResponse = parseBfetchResponse(resp);
        expect(parsedResponse).to.have.length(2);
        parsedResponse.forEach((responseJson) => {
          expect(responseJson.result).to.have.property('isPartial');
          expect(responseJson.result).to.have.property('isRunning');
          expect(responseJson.result).to.have.property('rawResponse');
        });
      });

      it('should return error for not found strategy', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .post(`/internal/bsearch`)
          .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
          .send({
            batch: [
              {
                request: {
                  params: {
                    index: '.kibana',
                    body: {
                      query: {
                        match_all: {},
                      },
                    },
                  },
                },
                options: {
                  strategy: 'wtf',
                },
              },
            ],
          });

        expect(resp.status).to.be(200);
        parseBfetchResponse(resp).forEach((responseJson, i) => {
          expect(responseJson.id).to.be(i);
          verifyErrorResponse(responseJson.error, 404, 'Search strategy wtf not found');
        });
      });

      it('should return 400 when index type is provided in "es" strategy', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .post(`/internal/bsearch`)
          .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
          .send({
            batch: [
              {
                request: {
                  index: '.kibana',
                  indexType: 'baad',
                  params: {
                    body: {
                      query: {
                        match_all: {},
                      },
                    },
                  },
                },
                options: {
                  strategy: 'es',
                },
              },
            ],
          });

        expect(resp.status).to.be(200);
        parseBfetchResponse(resp).forEach((responseJson, i) => {
          expect(responseJson.id).to.be(i);
          verifyErrorResponse(responseJson.error, 400, 'Unsupported index pattern type baad');
        });
      });

      describe('painless', () => {
        before(async () => {
          await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
        });

        after(async () => {
          await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
        });
        it('should return 400 "search_phase_execution_exception" for Painless error in "es" strategy', async () => {
          const resp = await supertestAdminWithCookieCredentials
            .post(`/internal/bsearch`)
            .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
            .send({
              batch: [
                {
                  request: painlessErrReq,
                  options: {
                    strategy: 'es',
                  },
                },
              ],
            });

          expect(resp.status).to.be(200);
          parseBfetchResponse(resp).forEach((responseJson, i) => {
            expect(responseJson.id).to.be(i);
            verifyErrorResponse(responseJson.error, 400, 'search_phase_execution_exception', true);
          });
        });
      });
    });
  });
}
