/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ES_INDEX_NAME } from './constants';
import moment from 'moment';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const chance = getService('chance');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('update_beat', () => {
    let validEnrollmentToken;
    let beat;
    const archive = 'beats/list';

    beforeEach('load beats archive', () => esArchiver.load(archive));
    beforeEach(async () => {
      validEnrollmentToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJjcmVhdGVkIjoiMjAxOC0wNi0zMFQwMzo0MjoxNS4yMzBaIiwiaWF0IjoxNTMwMzMwMTM1fQ.' +
        'SSsX2Byyo1B1bGxV8C3G4QldhE5iH87EY_1r21-bwbI';

      const version =
        chance.integer({ min: 1, max: 10 }) +
        '.' +
        chance.integer({ min: 1, max: 10 }) +
        '.' +
        chance.integer({ min: 1, max: 10 });

      beat = {
        type: `${chance.word()}beat`,
        host_name: `www.${chance.word()}.net`,
        name: chance.word(),
        version,
        ephemeral_id: chance.word(),
      };

      await es.index({
        index: ES_INDEX_NAME,
        id: `enrollment_token:${validEnrollmentToken}`,
        body: {
          type: 'enrollment_token',
          enrollment_token: {
            token: validEnrollmentToken,
            expires_on: moment()
              .add(4, 'hours')
              .toJSON(),
          },
        },
      });
    });

    afterEach('unload beats archive', () => esArchiver.unload(archive));

    it('should update an existing verified beat', async () => {
      const beatId = 'foo';
      await supertest
        .put(`/api/beats/agent/${beatId}`)
        .set('kbn-xsrf', 'xxx')
        .set(
          'kbn-beats-access-token',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
            'eyJjcmVhdGVkIjoiMjAxOC0wNi0zMFQwMzo0MjoxNS4yMzBaIiwiaWF0IjoxNTMwMzMwMTM1fQ.' +
            'SSsX2Byyo1B1bGxV8C3G4QldhE5iH87EY_1r21-bwbI'
        )
        .send(beat)
        .expect(200);

      const beatInEs = await es.get({
        index: ES_INDEX_NAME,
        id: `beat:${beatId}`,
      });

      expect(beatInEs._source.beat.id).to.be(beatId);
      expect(beatInEs._source.beat.type).to.be(beat.type);
      expect(beatInEs._source.beat.host_name).to.be(beat.host_name);
      expect(beatInEs._source.beat.version).to.be(beat.version);
      expect(beatInEs._source.beat.ephemeral_id).to.be(beat.ephemeral_id);
      expect(beatInEs._source.beat.name).to.be(beat.name);
    });

    it('should return an error for an invalid access token', async () => {
      const beatId = 'foo';
      const { body } = await supertest
        .put(`/api/beats/agent/${beatId}`)
        .set('kbn-xsrf', 'xxx')
        .set('kbn-beats-access-token', chance.word())
        .send(beat)
        .expect(401);

      expect(body.error.message).to.be('Invalid access token');

      const beatInEs = await es.get({
        index: ES_INDEX_NAME,
        id: `beat:${beatId}`,
      });

      expect(beatInEs._source.beat.id).to.be(beatId);
      expect(beatInEs._source.beat.type).to.not.be(beat.type);
      expect(beatInEs._source.beat.host_name).to.not.be(beat.host_name);
      expect(beatInEs._source.beat.version).to.not.be(beat.version);
      expect(beatInEs._source.beat.ephemeral_id).to.not.be(beat.ephemeral_id);
    });

    it('should return an error for a non-existent beat', async () => {
      const beatId = chance.word();
      const { body } = await supertest
        .put(`/api/beats/agent/${beatId}`)
        .set('kbn-xsrf', 'xxx')
        .set('kbn-beats-access-token', validEnrollmentToken)
        .send(beat)
        .expect(404);

      expect(body.error.message).to.be('Beat not found');
    });
  });
}
