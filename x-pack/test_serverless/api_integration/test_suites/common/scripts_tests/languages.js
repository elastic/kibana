/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { SCRIPT_LANGUAGES_ROUTE_LATEST_VERSION } from '@kbn/data-plugin/common/constants';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const svlCommonApi = getService('svlCommonApi');

  describe('Script Languages API', function getLanguages() {
    it('should return 200 with an array of languages', () =>
      supertest
        .get('/internal/scripts/languages')
        .set(ELASTIC_HTTP_VERSION_HEADER, SCRIPT_LANGUAGES_ROUTE_LATEST_VERSION)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .expect(200)
        .then((response) => {
          expect(response.body).to.be.an('array');
        }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('should only return langs enabled for inline scripting', () =>
      supertest
        .get('/internal/scripts/languages')
        .set(ELASTIC_HTTP_VERSION_HEADER, SCRIPT_LANGUAGES_ROUTE_LATEST_VERSION)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .expect(200)
        .then((response) => {
          expect(response.body).to.contain('expression');
          expect(response.body).to.contain('painless');
          expect(response.body).to.not.contain('groovy');
        }));
  });
}
