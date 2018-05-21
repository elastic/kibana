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
  const esArchiver = getService('esArchiver');

  describe('update_beat', () => {
    let beat;
    const archive = 'beats/list';

    beforeEach('load beats archive', () => esArchiver.load(archive));
    beforeEach(() => {
      const version = chance.integer({ min: 1, max: 10 })
        + '.'
        + chance.integer({ min: 1, max: 10 })
        + '.'
        + chance.integer({ min: 1, max: 10 });

      beat = {
        access_token: '93c4a4dd08564c189a7ec4e4f046b975',
        type: `${chance.word()}beat`,
        host_name: `www.${chance.word()}.net`,
        version,
        ephemeral_id: chance.word()
      };
    });

    afterEach('unload beats archive', () => esArchiver.unload(archive));

    it('should update an existing verified beat', async () => {
      const beatId = 'foo';
      await supertest
        .put(
          `/api/beats/agent/${beatId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send(beat)
        .expect(204);

      const beatInEs = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:${beatId}`
      });

      expect(beatInEs._source.beat.id).to.be(beatId);
      expect(beatInEs._source.beat.type).to.be(beat.type);
      expect(beatInEs._source.beat.host_name).to.be(beat.host_name);
      expect(beatInEs._source.beat.version).to.be(beat.version);
      expect(beatInEs._source.beat.ephemeral_id).to.be(beat.ephemeral_id);
    });

    it('should return an error for an invalid access token', async () => {
      const beatId = 'foo';
      beat.access_token = chance.word();
      const { body } = await supertest
        .put(
          `/api/beats/agent/${beatId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send(beat)
        .expect(401);

      expect(body.message).to.be('Invalid access token');

      const beatInEs = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:${beatId}`
      });

      expect(beatInEs._source.beat.id).to.be(beatId);
      expect(beatInEs._source.beat.type).to.not.be(beat.type);
      expect(beatInEs._source.beat.host_name).to.not.be(beat.host_name);
      expect(beatInEs._source.beat.version).to.not.be(beat.version);
      expect(beatInEs._source.beat.ephemeral_id).to.not.be(beat.ephemeral_id);
    });

    it('should return an error for an existing but unverified beat', async () => {
      const beatId = 'bar';
      beat.access_token = '3c4a4dd08564c189a7ec4e4f046b9759';
      const { body } = await supertest
        .put(
          `/api/beats/agent/${beatId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send(beat)
        .expect(400);

      expect(body.message).to.be('Beat has not been verified');

      const beatInEs = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:${beatId}`
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
        .put(
          `/api/beats/agent/${beatId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send(beat)
        .expect(404);

      expect(body.message).to.be('Beat not found');
    });
  });
}
