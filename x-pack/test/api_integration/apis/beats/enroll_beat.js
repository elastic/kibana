/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import {
  ES_INDEX_NAME,
  ES_TYPE_NAME
} from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const chance = getService('chance');
  const es = getService('es');

  describe('enroll_beat', () => {
    let beatId;
    let beat;
    beforeEach(() => {
      beatId = chance.word();
      beat = {
        enrollment_token: chance.string(),
        type: 'filebeat',
        host_ip: '11.22.33.44',
        host_name: 'foo.bar.com',
      };
    });

    it('should enroll beat in an unverified state', async () => {
      await supertest
        .post(
          `/api/beats/agent/${beatId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send(beat)
        .expect(201);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:${beatId}`
      });

      expect(esResponse._source.beat).to.not.have.property('verified_on');
    });

    it('should contain an access token in the response', async () => {
      const { body: apiResponse } = await supertest
        .post(
          `/api/beats/agent/${beatId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send(beat)
        .expect(201);

      const accessTokenFromApi = apiResponse.access_token;

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:${beatId}`
      });

      const accessTokenInEs = esResponse._source.beat.access_token;

      expect(accessTokenFromApi.length).to.be.greaterThan(0);
      expect(accessTokenFromApi).to.eql(accessTokenInEs);
    });

  });
}
