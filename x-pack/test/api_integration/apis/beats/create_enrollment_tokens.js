/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import moment from 'moment';
import {
  ES_INDEX_NAME,
  ES_TYPE_NAME
} from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const chance = getService('chance');
  const es = getService('es');

  describe('create_enrollment_token', () => {
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

    it('should set token expiration to 10 minutes from now by default', async () => {
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

      // We do a fuzzy check to see if the token expires between 9 and 10 minutes
      // from now because a bit of time has elapsed been the creation of the
      // tokens and this check.
      const tokenExpiresOn = moment(tokenInEs.expires_on).valueOf();
      const tenMinutesFromNow = moment().add('10', 'minutes').valueOf();
      const almostTenMinutesFromNow = moment(tenMinutesFromNow).subtract('2', 'seconds').valueOf();
      expect(tokenExpiresOn).to.be.lessThan(tenMinutesFromNow);
      expect(tokenExpiresOn).to.be.greaterThan(almostTenMinutesFromNow);
    });
  });
}
