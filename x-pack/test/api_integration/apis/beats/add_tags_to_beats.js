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

  describe('add_tags_to_beats', () => {
    const archive = 'beats/list';

    beforeEach('load beats archive', () => esArchiver.load(archive));
    afterEach('unload beats archive', () => esArchiver.unload(archive));

    it('should add a single tag to a single beat', async () => {
      const tags = [ chance.word() ];
      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/beats_tags'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          beat_ids: {
            bar: { tags }
          }
        })
        .expect(200);

      expect(apiResponse.beat_ids).to.eql({
        bar: { status: 200, result: 'added' }
      });

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:bar`
      });

      const beat = esResponse._source.beat;

      expect(beat.tags).to.eql(tags);
    });

    it('should add a single tag to a multiple beats', async () => {
    });

    it('should add multiple tags to a single beat', async () => {
    });

    it('should add multiple tags to a multiple beats', async () => {
    });

    it('should not re-add an existing tag to a beat', async () => {
    });

    it('should return errors for non-existent beats', async () => {
    });

    it('should return errors for non-existent tags', async () => {
    });
  });
}
