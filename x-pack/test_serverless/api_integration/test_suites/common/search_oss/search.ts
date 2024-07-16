/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import expect from '@kbn/expect';
import { RoleCredentials } from '../../../../shared/services';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { painlessErrReq } from './painless_err_req';
import { verifyErrorResponse } from './verify_error';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const svlCommonApi = getService('svlCommonApi');
  const kibanaServer = getService('kibanaServer');

  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;

  describe('search', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    before(async () => {
      // TODO: emptyKibanaIndex fails in Serverless with
      // "index_not_found_exception: no such index [.kibana_ingest]",
      // so it was switched to `savedObjects.cleanStandardList()`
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });
    describe('post', () => {
      it('should return 200 when correctly formatted searches are provided', async () => {
        const resp = await supertestWithoutAuth
          .post(`/internal/search/es`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(200);

        expect(resp.status).to.be(200);
        expect(resp.body.isPartial).to.be(false);
        expect(resp.body.isRunning).to.be(false);
        expect(resp.body).to.have.property('rawResponse');
        expect(resp.header).to.have.property(ELASTIC_HTTP_VERSION_HEADER, '1');
      });

      it('should return 200 if terminated early', async () => {
        const resp = await supertestWithoutAuth
          .post(`/internal/search/es`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({
            params: {
              terminateAfter: 1,
              index: 'log*',
              size: 1000,
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(200);

        expect(resp.status).to.be(200);
        expect(resp.body.isPartial).to.be(false);
        expect(resp.body.isRunning).to.be(false);
        expect(resp.body.rawResponse.terminated_early).to.be(true);
        expect(resp.header).to.have.property(ELASTIC_HTTP_VERSION_HEADER, '1');
      });

      it('should return 404 when if no strategy is provided', async () => {
        const resp = await supertestWithoutAuth
          .post(`/internal/search`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({
            body: {
              query: {
                match_all: {},
              },
            },
          })
          .expect(404);

        verifyErrorResponse(resp.body, 404);
      });

      it('should return 404 when if unknown strategy is provided', async () => {
        const resp = await supertestWithoutAuth
          .post(`/internal/search/banana`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({
            body: {
              query: {
                match_all: {},
              },
            },
          })
          .expect(404);

        verifyErrorResponse(resp.body, 404);
        expect(resp.body.message).to.contain('banana not found');
        expect(resp.header).to.have.property(ELASTIC_HTTP_VERSION_HEADER, '1');
      });

      it('should return 400 with illegal ES argument', async () => {
        const resp = await supertestWithoutAuth
          .post(`/internal/search/es`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({
            params: {
              timeout: 1, // This should be a time range string!
              index: 'log*',
              size: 1000,
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'illegal_argument_exception', true);
      });

      it('should return 400 with a bad body', async () => {
        const resp = await supertestWithoutAuth
          .post(`/internal/search/es`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({
            params: {
              body: {
                index: 'nope nope',
                bad_query: [],
              },
            },
          })
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'parsing_exception', true);
      });

      it('should return 400 for a painless error', async () => {
        const resp = await supertestWithoutAuth
          .post(`/internal/search/es`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send(painlessErrReq)
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'search_phase_execution_exception', true);
      });
    });

    describe('delete', () => {
      it('should return 404 when no search id provided', async () => {
        const resp = await supertestWithoutAuth
          .delete(`/internal/search/es`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send()
          .expect(404);
        verifyErrorResponse(resp.body, 404);
      });

      it('should return 400 when trying a delete on a non supporting strategy', async () => {
        const resp = await supertestWithoutAuth
          .delete(`/internal/search/es/123`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send()
          .expect(400);
        verifyErrorResponse(resp.body, 400);
        expect(resp.body.message).to.contain("Search strategy es doesn't support cancellations");
        expect(resp.header).to.have.property(ELASTIC_HTTP_VERSION_HEADER, '1');
      });
    });
  });
}
