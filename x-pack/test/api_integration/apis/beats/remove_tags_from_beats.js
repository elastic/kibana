/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ES_INDEX_NAME } from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const chance = getService('chance');

  describe('remove_tags_from_beats', () => {
    const archive = 'beats/list';

    beforeEach('load beats archive', () => esArchiver.load(archive));
    afterEach('unload beats archive', () => esArchiver.unload(archive));

    it('should remove a single tag from a single beat', async () => {
      const { body: apiResponse } = await supertest
        .post('/api/beats/agents_tags/removals')
        .set('kbn-xsrf', 'xxx')
        .send({
          removals: [{ beatId: 'foo', tag: 'production' }],
        })
        .expect(200);

      expect(apiResponse.results).to.eql([{ success: true, result: { message: 'updated' } }]);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `beat:foo`,
      });

      const beat = esResponse._source.beat;
      expect(beat.tags).to.eql(['qa']);
    });

    it('should remove a single tag from a multiple beats', async () => {
      const { body: apiResponse } = await supertest
        .post('/api/beats/agents_tags/removals')
        .set('kbn-xsrf', 'xxx')
        .send({
          removals: [{ beatId: 'foo', tag: 'development' }, { beatId: 'bar', tag: 'development' }],
        })
        .expect(200);

      expect(apiResponse.results).to.eql([
        { success: true, result: { message: 'updated' } },
        { success: true, result: { message: 'updated' } },
      ]);

      let esResponse;
      let beat;

      // Beat foo
      esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `beat:foo`,
      });

      beat = esResponse._source.beat;
      expect(beat.tags).to.eql(['production', 'qa']); // as beat 'foo' already had 'production' and 'qa' tags attached to it

      // Beat bar
      esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `beat:bar`,
      });

      beat = esResponse._source.beat;
      expect(beat).to.not.have.property('tags');
    });

    it('should remove multiple tags from a single beat', async () => {
      const { body: apiResponse } = await supertest
        .post('/api/beats/agents_tags/removals')
        .set('kbn-xsrf', 'xxx')
        .send({
          removals: [{ beatId: 'foo', tag: 'development' }, { beatId: 'foo', tag: 'production' }],
        })
        .expect(200);

      expect(apiResponse.results).to.eql([
        { success: true, result: { message: 'updated' } },
        { success: true, result: { message: 'updated' } },
      ]);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `beat:foo`,
      });

      const beat = esResponse._source.beat;
      expect(beat.tags).to.eql(['qa']); // as beat 'foo' already had 'production' and 'qa' tags attached to it
    });

    it('should remove multiple tags from a multiple beats', async () => {
      const { body: apiResponse } = await supertest
        .post('/api/beats/agents_tags/removals')
        .set('kbn-xsrf', 'xxx')
        .send({
          removals: [{ beatId: 'foo', tag: 'production' }, { beatId: 'bar', tag: 'development' }],
        })
        .expect(200);

      expect(apiResponse.results).to.eql([
        { success: true, result: { message: 'updated' } },
        { success: true, result: { message: 'updated' } },
      ]);

      let esResponse;
      let beat;

      // Beat foo
      esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `beat:foo`,
      });

      beat = esResponse._source.beat;
      expect(beat.tags).to.eql(['qa']); // as beat 'foo' already had 'production' and 'qa' tags attached to it

      // Beat bar
      esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `beat:bar`,
      });

      beat = esResponse._source.beat;
      expect(beat).to.not.have.property('tags');
    });

    it('should return errors for non-existent beats', async () => {
      const nonExistentBeatId = chance.word();

      const { body: apiResponse } = await supertest
        .post('/api/beats/agents_tags/removals')
        .set('kbn-xsrf', 'xxx')
        .send({
          removals: [{ beatId: nonExistentBeatId, tag: 'production' }],
        })
        .expect(200);

      expect(apiResponse.results).to.eql([
        { success: false, error: { code: 404, message: `Beat ${nonExistentBeatId} not found` } },
      ]);
    });

    it('should return errors for non-existent tags', async () => {
      const nonExistentTag = chance.word();

      const { body: apiResponse } = await supertest
        .post('/api/beats/agents_tags/removals')
        .set('kbn-xsrf', 'xxx')
        .send({
          removals: [{ beatId: 'bar', tag: nonExistentTag }],
        })
        .expect(200);

      expect(apiResponse.results).to.eql([
        { success: false, error: { code: 404, message: `Tag ${nonExistentTag} not found` } },
      ]);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `beat:bar`,
      });

      const beat = esResponse._source.beat;
      expect(beat).to.not.have.property('tags');
    });

    it('should return errors for non-existent beats and tags', async () => {
      const nonExistentBeatId = chance.word();
      const nonExistentTag = chance.word();

      const { body: apiResponse } = await supertest
        .post('/api/beats/agents_tags/removals')
        .set('kbn-xsrf', 'xxx')
        .send({
          removals: [{ beatId: nonExistentBeatId, tag: nonExistentTag }],
        })
        .expect(200);

      expect(apiResponse.results).to.eql([
        {
          success: false,
          error: {
            code: 404,
            message: `Beat ${nonExistentBeatId} and tag ${nonExistentTag} not found`,
          },
        },
      ]);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `beat:bar`,
      });

      const beat = esResponse._source.beat;
      expect(beat).to.not.have.property('tags');
    });
  });
}
