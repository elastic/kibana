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

  describe('enroll_beat', () => {
    let validEnrollmentToken;
    let beatId;
    let beat;

    beforeEach(async () => {
      validEnrollmentToken = chance.word();
      beatId = chance.word();
      beat = {
        enrollment_token: validEnrollmentToken,
        type: 'filebeat',
        host_ip: '11.22.33.44',
        host_name: 'foo.bar.com',
      };

      await es.index({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `enrollment_token:${validEnrollmentToken}`,
        body: {
          type: 'enrollment_token',
          enrollment_token: {
            token: validEnrollmentToken,
            expires_on: moment().add(4, 'hours').toJSON()
          }
        }
      });
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

    it('should reject an invalid enrollment token', async () => {
      const invalidEnrollmentToken = chance.word();
      beat.enrollment_token = invalidEnrollmentToken;

      const { body: apiResponse } = await supertest
        .post(
          `/api/beats/agent/${beatId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send(beat)
        .expect(400);

      expect(apiResponse).to.eql({ message: 'Invalid enrollment token' });
    });

    it('should reject an expired enrollment token', async () => {
      const expiredEnrollmentToken = chance.word();

      await es.index({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `enrollment_token:${expiredEnrollmentToken}`,
        body: {
          type: 'enrollment_token',
          enrollment_token: {
            token: expiredEnrollmentToken,
            expires_on: moment().subtract(1, 'minute').toJSON()
          }
        }
      });

      beat.enrollment_token = expiredEnrollmentToken;

      const { body: apiResponse } = await supertest
        .post(
          `/api/beats/agent/${beatId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send(beat)
        .expect(400);

      expect(apiResponse).to.eql({ message: 'Expired enrollment token' });
    });

    it('should delete the given enrollment token so it may not be reused', async () => {
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
        id: `enrollment_token:${validEnrollmentToken}`,
        ignore: [ 404 ]
      });

      expect(esResponse.found).to.be(false);
    });
  });
}
