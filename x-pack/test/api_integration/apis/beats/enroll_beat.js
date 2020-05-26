/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import moment from 'moment';

import { ES_INDEX_NAME } from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const randomness = getService('randomness');
  const es = getService('legacyEs');

  describe('enroll_beat', () => {
    let validEnrollmentToken;
    let beatId;
    let beat;

    beforeEach(async () => {
      validEnrollmentToken = randomness.word();

      beatId = randomness.word();
      const version =
        randomness.integer({ min: 1, max: 10 }) +
        '.' +
        randomness.integer({ min: 1, max: 10 }) +
        '.' +
        randomness.integer({ min: 1, max: 10 });

      beat = {
        type: 'filebeat',
        host_name: 'foo.bar.com',
        name: randomness.word(),
        version,
      };

      await es.index({
        index: ES_INDEX_NAME,
        id: `enrollment_token:${validEnrollmentToken}`,
        body: {
          type: 'enrollment_token',
          enrollment_token: {
            token: validEnrollmentToken,
            expires_on: moment().add(4, 'hours').toJSON(),
          },
        },
      });
    });

    it('should enroll beat in a verified state', async () => {
      await supertest
        .post(`/api/beats/agent/${beatId}`)
        .set('kbn-xsrf', 'xxx')
        .set('kbn-beats-enrollment-token', validEnrollmentToken)
        .send(beat)
        .expect(200);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `beat:${beatId}`,
      });

      expect(esResponse._source.beat).to.have.property('verified_on');
      expect(esResponse._source.beat).to.have.property('host_ip');
    });

    it('should contain an access token in the response', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/beats/agent/${beatId}`)
        .set('kbn-xsrf', 'xxx')
        .set('kbn-beats-enrollment-token', validEnrollmentToken)
        .send(beat)
        .expect(200);

      const accessTokenFromApi = apiResponse.item;

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `beat:${beatId}`,
      });

      const accessTokenInEs = esResponse._source.beat.access_token;

      expect(accessTokenFromApi.length).to.be.greaterThan(0);
      expect(accessTokenFromApi).to.eql(accessTokenInEs);
    });

    it('should reject an invalid enrollment token', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/beats/agent/${beatId}`)
        .set('kbn-xsrf', 'xxx')
        .set('kbn-beats-enrollment-token', randomness.word())
        .send(beat)
        .expect(400);

      expect(apiResponse).to.eql({
        success: false,
        error: { code: 400, message: 'Invalid enrollment token' },
      });
    });

    it('should reject an expired enrollment token', async () => {
      const expiredEnrollmentToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJjcmVhdGVkIjoiMjAxOC0wNi0zMFQwMzo0MjoxNS4yMzBaIiwiaWF0IjoxNTMwMzMwMTM1LCJleHAiOjE1MzAzMzAxMzV9.' +
        'Azf4czAwWZEflR7Pf8pi-DUTcve9xyxWyViNYeUSGog';

      await es.index({
        index: ES_INDEX_NAME,
        id: `enrollment_token:${expiredEnrollmentToken}`,
        body: {
          type: 'enrollment_token',
          enrollment_token: {
            token: expiredEnrollmentToken,
            expires_on: moment().subtract(1, 'minute').toJSON(),
          },
        },
      });

      const { body: apiResponse } = await supertest
        .post(`/api/beats/agent/${beatId}`)
        .set('kbn-xsrf', 'xxx')
        .set('kbn-beats-enrollment-token', expiredEnrollmentToken)
        .send(beat)
        .expect(400);

      expect(apiResponse).to.eql({
        success: false,
        error: { code: 400, message: 'Expired enrollment token' },
      });
    });

    it('should delete the given enrollment token so it may not be reused', async () => {
      await supertest
        .post(`/api/beats/agent/${beatId}`)
        .set('kbn-xsrf', 'xxx')
        .set('kbn-beats-enrollment-token', validEnrollmentToken)
        .send(beat)
        .expect(200);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `enrollment_token:${validEnrollmentToken}`,
        ignore: [404],
      });

      expect(esResponse.found).to.be(false);
    });

    it('should fail if the beat with the same ID is enrolled twice', async () => {
      await supertest
        .post(`/api/beats/agent/${beatId}`)
        .set('kbn-xsrf', 'xxx')
        .set('kbn-beats-enrollment-token', validEnrollmentToken)
        .send(beat)
        .expect(200);

      await es.index({
        index: ES_INDEX_NAME,
        id: `enrollment_token:${validEnrollmentToken}`,
        body: {
          type: 'enrollment_token',
          enrollment_token: {
            token: validEnrollmentToken,
            expires_on: moment().add(4, 'hours').toJSON(),
          },
        },
      });

      await supertest
        .post(`/api/beats/agent/${beatId}`)
        .set('kbn-xsrf', 'xxx')
        .set('kbn-beats-enrollment-token', validEnrollmentToken)
        .send(beat)
        .expect(200);
    });
  });
}
