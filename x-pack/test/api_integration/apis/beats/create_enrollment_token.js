/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import moment from 'moment';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const chance = getService('chance');
  const es = getService('es');

  const ES_INDEX_NAME = '.management-beats';
  const ES_TYPE_NAME = '_doc';

  describe('create_enrollment_token', () => {
    const cleanup = () => {
      return es.indices.delete({
        index: ES_INDEX_NAME,
        ignore: [ 404 ]
      });
    };

    beforeEach(cleanup);
    afterEach(cleanup);

    it('should create one token by default', async () => {
      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/enrollment_tokens'
        )
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(200);

      const tokensFromApi = apiResponse.tokens;

      const esResponse = await es.search({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        q: 'type:enrollment_token'
      });

      const tokensInEs = esResponse.hits.hits
        .map(hit => hit._source.enrollment_token.token);

      expect(tokensFromApi.length).to.eql(1);
      expect(tokensFromApi).to.eql(tokensInEs);
    });

    it('should create the specified number of tokens', async () => {
      const numTokens = chance.integer({ min: 1, max: 2000 });

      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/enrollment_tokens'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          num_tokens: numTokens
        })
        .expect(200);

      const tokensFromApi = apiResponse.tokens;

      const esResponse = await es.search({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        q: 'type:enrollment_token',
        size: numTokens
      });

      const tokensInEs = esResponse.hits.hits
        .map(hit => hit._source.enrollment_token.token);

      expect(tokensFromApi.length).to.eql(numTokens);
      expect(tokensFromApi).to.eql(tokensInEs);
    });

    it('should set token expiration to 4 hours from now by default', async () => {
      await supertest
        .post(
          '/api/beats/enrollment_tokens'
        )
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(200);

      const esResponse = await es.search({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        q: 'type:enrollment_token'
      });

      const tokenInEs = esResponse.hits.hits[0]._source.enrollment_token;

      const tokenExpiresOn = moment(tokenInEs.expires_on).valueOf();
      const fourHoursFromNow = moment().add('4', 'hours').valueOf();
      expect(tokenExpiresOn).to.be.lessThan(fourHoursFromNow);
    });
  });
}
