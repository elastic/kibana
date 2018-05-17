/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const chance = getService('chance');

  describe('verify_beats', () => {
    const archive = 'beats/list';

    beforeEach('load beats archive', () => esArchiver.load(archive));
    afterEach('unload beats archive', () => esArchiver.unload(archive));

    it('verify the given beats', async () => {
      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/agents/verify'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          beats: [
            { id: 'bar' },
            { id: 'baz' }
          ]
        })
        .expect(200);

      expect(apiResponse.beats).to.eql([
        { id: 'bar', status: 200, result: 'verified' },
        { id: 'baz', status: 200, result: 'verified' },
      ]);
    });

    it('should not re-verify already-verified beats', async () => {
      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/agents/verify'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          beats: [
            { id: 'foo' },
            { id: 'bar' }
          ]
        })
        .expect(200);

      expect(apiResponse.beats).to.eql([
        { id: 'foo', status: 200, result: 'already verified' },
        { id: 'bar', status: 200, result: 'verified' }
      ]);
    });

    it('should return errors for non-existent beats', async () => {
      const nonExistentBeatId = chance.word();
      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/agents/verify'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          beats: [
            { id: 'bar' },
            { id: nonExistentBeatId }
          ]
        })
        .expect(200);

      expect(apiResponse.beats).to.eql([
        { id: 'bar', status: 200, result: 'verified' },
        { id: nonExistentBeatId, status: 404, result: 'not found' },
      ]);
    });
  });
}
