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
  const es = getService('es');

  describe('create_configuration_block', () => {
    it('should create the given configuration block', async () => {
      const configurationBlock = {
        type: 'output',
        tag: 'production',
        block_yml: 'elasticsearch:\n    hosts: [\"localhost:9200\"]\n    username: "..."'
      };
      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/configuration_blocks'
        )
        .set('kbn-xsrf', 'xxx')
        .send(configurationBlock)
        .expect(201);

      const idFromApi = apiResponse.id;

      const esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `configuration_block:${idFromApi}`
      });

      const docInEs = esResponse._source;

      expect(docInEs.type).to.eql('configuration_block');
      expect(docInEs.configuration_block.type).to.eql(configurationBlock.type);
      expect(docInEs.configuration_block.tag).to.eql(configurationBlock.tag);
      expect(docInEs.configuration_block.block_yml).to.eql(configurationBlock.block_yml);
    });

    it('should not allow two "output" type configuration blocks with the same tag', async () => {
      const firstConfigurationBlock = {
        type: 'output',
        tag: 'production',
        block_yml: 'elasticsearch:\n    hosts: [\"localhost:9200\"]\n    username: "..."'
      };
      await supertest
        .post(
          '/api/beats/configuration_blocks'
        )
        .set('kbn-xsrf', 'xxx')
        .send(firstConfigurationBlock)
        .expect(201);

      const secondConfigurationBlock = {
        type: 'output',
        tag: 'production',
        block_yml: 'logstash:\n    hosts: [\"localhost:9000\"]\n'
      };
      await supertest
        .post(
          '/api/beats/configuration_blocks'
        )
        .set('kbn-xsrf', 'xxx')
        .send(secondConfigurationBlock)
        .expect(400);
    });

    it('should allow two "output" type configuration blocks with different tags', async () => {
      const firstConfigurationBlock = {
        type: 'output',
        tag: 'production',
        block_yml: 'elasticsearch:\n    hosts: [\"localhost:9200\"]\n    username: "..."'
      };
      await supertest
        .post(
          '/api/beats/configuration_blocks'
        )
        .set('kbn-xsrf', 'xxx')
        .send(firstConfigurationBlock)
        .expect(201);

      const secondConfigurationBlock = {
        type: 'output',
        tag: 'development',
        block_yml: 'logstash:\n    hosts: [\"localhost:9000\"]\n'
      };
      await supertest
        .post(
          '/api/beats/configuration_blocks'
        )
        .set('kbn-xsrf', 'xxx')
        .send(secondConfigurationBlock)
        .expect(201);
    });

    it('should allow two configuration blocks of different types with the same tag', async () => {
      const firstConfigurationBlock = {
        type: 'output',
        tag: 'production',
        block_yml: 'elasticsearch:\n    hosts: [\"localhost:9200\"]\n    username: "..."'
      };
      await supertest
        .post(
          '/api/beats/configuration_blocks'
        )
        .set('kbn-xsrf', 'xxx')
        .send(firstConfigurationBlock)
        .expect(201);

      const secondConfigurationBlock = {
        type: 'input',
        tag: 'production',
        block_yml: 'file:\n    path: \"/var/log/some.log\"]\n'
      };
      await supertest
        .post(
          '/api/beats/configuration_blocks'
        )
        .set('kbn-xsrf', 'xxx')
        .send(secondConfigurationBlock)
        .expect(201);
    });
  });
}
