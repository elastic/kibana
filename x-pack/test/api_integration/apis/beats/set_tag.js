/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ES_INDEX_NAME } from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  describe('set_tag', () => {
    it('should create a tag', async () => {
      const tagId = 'production';
      await supertest
        .put(`/api/beats/tag/${tagId}`)
        .set('kbn-xsrf', 'xxx')
        .send({
          color: 'green',
        })
        .expect(200);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `tag:${tagId}`,
      });

      const tagInEs = esResponse._source;

      expect(tagInEs.type).to.be('tag');
      expect(tagInEs.tag.id).to.be(tagId);
    });

    it('should update an existing tag', async () => {
      const tagId = 'production';
      await supertest
        .put(`/api/beats/tag/${tagId}`)
        .set('kbn-xsrf', 'xxx')
        .send({
          color: 'blue',
        })
        .expect(200);

      await supertest
        .put(`/api/beats/tag/${tagId}`)
        .set('kbn-xsrf', 'xxx')
        .send({
          color: 'yellow',
        })
        .expect(200);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        id: `tag:${tagId}`,
      });

      const tagInEs = esResponse._source;

      expect(tagInEs.type).to.be('tag');
      expect(tagInEs.tag.id).to.be(tagId);
      expect(tagInEs.tag.color).to.be('yellow');
    });
  });
}
