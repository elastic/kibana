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

  describe('set_tag', () => {
    it('should create an empty tag', async () => {
      const tagId = 'production';
      await supertest
        .put(
          `/api/beats/tag/${tagId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(201);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `tag:${tagId}`
      });

      const tagInEs = esResponse._source;

      expect(tagInEs.type).to.be('tag');
      expect(tagInEs.tag.id).to.be(tagId);
      expect(tagInEs.tag.configuration_blocks).to.be.an(Array);
      expect(tagInEs.tag.configuration_blocks.length).to.be(0);
    });

    it('should create a tag with one configuration block', async () => {
      const tagId = 'production';
      await supertest
        .put(
          `/api/beats/tag/${tagId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          configuration_blocks: [
            {
              type: 'output',
              block_yml: 'elasticsearch:\n    hosts: [\"localhost:9200\"]\n    username: "..."'
            }
          ]
        })
        .expect(201);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `tag:${tagId}`
      });

      const tagInEs = esResponse._source;

      expect(tagInEs.type).to.be('tag');
      expect(tagInEs.tag.id).to.be(tagId);
      expect(tagInEs.tag.configuration_blocks).to.be.an(Array);
      expect(tagInEs.tag.configuration_blocks.length).to.be(1);
      expect(tagInEs.tag.configuration_blocks[0].type).to.be('output');
      expect(tagInEs.tag.configuration_blocks[0].block_yml).to.be('elasticsearch:\n    hosts: [\"localhost:9200\"]\n    username: "..."');
    });

    it('should create a tag with two configuration blocks', async () => {
      const tagId = 'production';
      await supertest
        .put(
          `/api/beats/tag/${tagId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          configuration_blocks: [
            {
              type: 'filebeat.inputs',
              block_yml: 'file:\n    path: "/var/log/some.log"]\n'
            },
            {
              type: 'output',
              block_yml: 'elasticsearch:\n    hosts: [\"localhost:9200\"]\n    username: "..."'
            }
          ]
        })
        .expect(201);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `tag:${tagId}`
      });

      const tagInEs = esResponse._source;

      expect(tagInEs.type).to.be('tag');
      expect(tagInEs.tag.id).to.be(tagId);
      expect(tagInEs.tag.configuration_blocks).to.be.an(Array);
      expect(tagInEs.tag.configuration_blocks.length).to.be(2);
      expect(tagInEs.tag.configuration_blocks[0].type).to.be('filebeat.inputs');
      expect(tagInEs.tag.configuration_blocks[0].block_yml).to.be('file:\n    path: "/var/log/some.log"]\n');
      expect(tagInEs.tag.configuration_blocks[1].type).to.be('output');
      expect(tagInEs.tag.configuration_blocks[1].block_yml).to.be('elasticsearch:\n    hosts: [\"localhost:9200\"]\n    username: "..."');
    });

    it('should fail when creating a tag with two configuration blocks of type output', async () => {
      const tagId = 'production';
      await supertest
        .put(
          `/api/beats/tag/${tagId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          configuration_blocks: [
            {
              type: 'output',
              block_yml: 'logstash:\n    hosts: ["localhost:9000"]\n'
            },
            {
              type: 'output',
              block_yml: 'elasticsearch:\n    hosts: [\"localhost:9200\"]\n    username: "..."'
            }
          ]
        })
        .expect(400);
    });

    it('should fail when creating a tag with an invalid configuration block type', async () => {
      const tagId = 'production';
      await supertest
        .put(
          `/api/beats/tag/${tagId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          configuration_blocks: [
            {
              type: chance.word(),
              block_yml: 'logstash:\n    hosts: ["localhost:9000"]\n'
            }
          ]
        })
        .expect(400);
    });

    it('should update an existing tag', async () => {
      const tagId = 'production';
      await supertest
        .put(
          `/api/beats/tag/${tagId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          configuration_blocks: [
            {
              type: 'filebeat.inputs',
              block_yml: 'file:\n    path: "/var/log/some.log"]\n'
            },
            {
              type: 'output',
              block_yml: 'elasticsearch:\n    hosts: [\"localhost:9200\"]\n    username: "..."'
            }
          ]
        })
        .expect(201);

      await supertest
        .put(
          `/api/beats/tag/${tagId}`
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          configuration_blocks: [
            {
              type: 'output',
              block_yml: 'logstash:\n    hosts: ["localhost:9000"]\n'
            }
          ]
        })
        .expect(200);

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `tag:${tagId}`
      });

      const tagInEs = esResponse._source;

      expect(tagInEs.type).to.be('tag');
      expect(tagInEs.tag.id).to.be(tagId);
      expect(tagInEs.tag.configuration_blocks).to.be.an(Array);
      expect(tagInEs.tag.configuration_blocks.length).to.be(1);
      expect(tagInEs.tag.configuration_blocks[0].type).to.be('output');
      expect(tagInEs.tag.configuration_blocks[0].block_yml).to.be('logstash:\n    hosts: ["localhost:9000"]\n');
    });
  });
}
