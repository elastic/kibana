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
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const chance = getService('chance');

  describe('assign_tags_to_beats', () => {
    const archive = 'beats/list';

    beforeEach('load beats archive', () => esArchiver.load(archive));
    afterEach('unload beats archive', () => esArchiver.unload(archive));

    it('should add a single tag to a single beat', async () => {
      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/agents_tags/assignments'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          assignments: [
            { beat_id: 'bar', tag: 'production' }
          ]
        })
        .expect(200);

      expect(apiResponse.assignments).to.eql([
        { status: 200, result: 'updated' }
      ]);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:bar`
      });

      const beat = esResponse._source.beat;
      expect(beat.tags).to.eql(['production']);
    });

    it('should not re-add an existing tag to a beat', async () => {
      const tags = ['production'];

      let esResponse;
      let beat;

      // Before adding the existing tag
      esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:foo`
      });

      beat = esResponse._source.beat;
      expect(beat.tags).to.eql(tags);

      // Adding the existing tag
      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/agents_tags/assignments'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          assignments: [
            { beat_id: 'foo', tag: 'production' }
          ]
        })
        .expect(200);

      expect(apiResponse.assignments).to.eql([
        { status: 200, result: 'updated' }
      ]);

      // After adding the existing tag
      esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:foo`
      });

      beat = esResponse._source.beat;
      expect(beat.tags).to.eql(tags);
    });

    it('should add a single tag to a multiple beats', async () => {
      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/agents_tags/assignments'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          assignments: [
            { beat_id: 'foo', tag: 'development' },
            { beat_id: 'bar', tag: 'development' }
          ]
        })
        .expect(200);

      expect(apiResponse.assignments).to.eql([
        { status: 200, result: 'updated' },
        { status: 200, result: 'updated' }
      ]);

      let esResponse;
      let beat;

      // Beat foo
      esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:foo`
      });

      beat = esResponse._source.beat;
      expect(beat.tags).to.eql(['production', 'development']); // as beat 'foo' already had 'production' tag attached to it

      // Beat bar
      esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:bar`
      });

      beat = esResponse._source.beat;
      expect(beat.tags).to.eql(['development']);
    });

    it('should add multiple tags to a single beat', async () => {
      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/agents_tags/assignments'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          assignments: [
            { beat_id: 'bar', tag: 'development' },
            { beat_id: 'bar', tag: 'production' }
          ]
        })
        .expect(200);

      expect(apiResponse.assignments).to.eql([
        { status: 200, result: 'updated' },
        { status: 200, result: 'updated' }
      ]);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:bar`
      });

      const beat = esResponse._source.beat;
      expect(beat.tags).to.eql(['development', 'production']);
    });

    it('should add multiple tags to a multiple beats', async () => {
      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/agents_tags/assignments'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          assignments: [
            { beat_id: 'foo', tag: 'development' },
            { beat_id: 'bar', tag: 'production' }
          ]
        })
        .expect(200);

      expect(apiResponse.assignments).to.eql([
        { status: 200, result: 'updated' },
        { status: 200, result: 'updated' }
      ]);

      let esResponse;
      let beat;

      // Beat foo
      esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:foo`
      });

      beat = esResponse._source.beat;
      expect(beat.tags).to.eql(['production', 'development']); // as beat 'foo' already had 'production' tag attached to it

      // Beat bar
      esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:bar`
      });

      beat = esResponse._source.beat;
      expect(beat.tags).to.eql(['production']);
    });

    it('should return errors for non-existent beats', async () => {
      const nonExistentBeatId = chance.word();

      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/agents_tags/assignments'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          assignments: [
            { beat_id: nonExistentBeatId, tag: 'production' }
          ]
        })
        .expect(200);

      expect(apiResponse.assignments).to.eql([
        { status: 404, result: `Beat ${nonExistentBeatId} not found` }
      ]);
    });

    it('should return errors for non-existent tags', async () => {
      const nonExistentTag = chance.word();

      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/agents_tags/assignments'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          assignments: [
            { beat_id: 'bar', tag: nonExistentTag }
          ]
        })
        .expect(200);

      expect(apiResponse.assignments).to.eql([
        { status: 404, result: `Tag ${nonExistentTag} not found` }
      ]);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:bar`
      });

      const beat = esResponse._source.beat;
      expect(beat).to.not.have.property('tags');
    });

    it('should return errors for non-existent beats and tags', async () => {
      const nonExistentBeatId = chance.word();
      const nonExistentTag = chance.word();

      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/agents_tags/assignments'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          assignments: [
            { beat_id: nonExistentBeatId, tag: nonExistentTag }
          ]
        })
        .expect(200);

      expect(apiResponse.assignments).to.eql([
        { status: 404, result: `Beat ${nonExistentBeatId} and tag ${nonExistentTag} not found` }
      ]);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:bar`
      });

      const beat = esResponse._source.beat;
      expect(beat).to.not.have.property('tags');
    });
  });
}
