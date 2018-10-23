/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { ES_INDEX_NAME, ES_TYPE_NAME } from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('get_beat_configuration', () => {
    const archive = 'beats/list';

    beforeEach('load beats archive', () => esArchiver.load(archive));
    afterEach('unload beats archive', () => esArchiver.unload(archive));

    it('should return merged configuration for the beat', async () => {
      const { body: apiResponse } = await supertest
        .get('/api/beats/agent/foo/configuration')
        .set(
          'kbn-beats-access-token',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
            'eyJjcmVhdGVkIjoiMjAxOC0wNi0zMFQwMzo0MjoxNS4yMzBaIiwiaWF0IjoxNTMwMzMwMTM1fQ.' +
            'SSsX2Byyo1B1bGxV8C3G4QldhE5iH87EY_1r21-bwbI'
        )
        .expect(200);

      const configurationBlocks = apiResponse.configuration_blocks;

      expect(configurationBlocks).to.be.an(Array);
      expect(configurationBlocks.length).to.be(3);

      expect(configurationBlocks[1].type).to.be('metricbeat.modules');
      expect(configurationBlocks[1].config).not.to.be.an('array');
      expect(configurationBlocks[1].config).to.eql({
        module: 'memcached',
        hosts: ['localhost:11211'],
      });

      expect(configurationBlocks[2].type).to.be('metricbeat.modules');
      expect(configurationBlocks[2].config).not.to.be.an('array');
      expect(configurationBlocks[2].config).to.eql({
        module: 'memcached',
        hosts: ['localhost:4949'],
        'node.namespace': 'node',
      });
    });

    it('A config check with a validSetting of false should set an error status on the beat', async () => {
      // 1. Initial request
      await supertest
        .get('/api/beats/agent/foo/configuration?validSetting=true')
        .set(
          'kbn-beats-access-token',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
            'eyJjcmVhdGVkIjoiMjAxOC0wNi0zMFQwMzo0MjoxNS4yMzBaIiwiaWF0IjoxNTMwMzMwMTM1fQ.' +
            'SSsX2Byyo1B1bGxV8C3G4QldhE5iH87EY_1r21-bwbI'
        )
        .expect(200);

      let esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:foo`,
      });

      let beat = esResponse._source.beat;
      expect(beat.config_status).to.be('OK');

      // 2. Beat polls reporting an error
      await supertest
        .get('/api/beats/agent/foo/configuration?validSetting=false')
        .set(
          'kbn-beats-access-token',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
            'eyJjcmVhdGVkIjoiMjAxOC0wNi0zMFQwMzo0MjoxNS4yMzBaIiwiaWF0IjoxNTMwMzMwMTM1fQ.' +
            'SSsX2Byyo1B1bGxV8C3G4QldhE5iH87EY_1r21-bwbI'
        )
        .expect(200);

      esResponse = await es.get({
        index: ES_INDEX_NAME,
        type: ES_TYPE_NAME,
        id: `beat:foo`,
      });

      beat = esResponse._source.beat;
      expect(beat.config_status).to.be('ERROR');
    });
  });
}
