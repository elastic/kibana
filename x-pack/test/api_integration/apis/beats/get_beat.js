/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ES_INDEX_NAME } from './constants';

export default function({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  describe('get_beat_configuration', () => {
    const archive = 'beats/list';

    beforeEach('load beats archive', () => esArchiver.load(archive));
    afterEach('unload beats archive', () => esArchiver.unload(archive));

    it('should return no configurations for the beat without tags', async () => {
      await es.index({
        index: ES_INDEX_NAME,
        id: `beat:empty`,
        body: {
          type: 'beat',
          beat: {
            type: 'filebeat',
            active: true,
            host_ip: '1.2.3.4',
            host_name: 'empty.com',
            id: 'empty',
            name: 'empty_filebeat',
            access_token:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkIjoiMjAxOC0wNi0zMFQwMzo0MjoxNS4yMzBaIiwiaWF0IjoxNTMwMzMwMTM1fQ.SSsX2Byyo1B1bGxV8C3G4QldhE5iH87EY_1r21-bwbI', // eslint-disable-line
          },
        },
      });

      const { body: apiResponse } = await supertest
        .get('/api/beats/agent/empty/configuration')
        .set(
          'kbn-beats-access-token',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
            'eyJjcmVhdGVkIjoiMjAxOC0wNi0zMFQwMzo0MjoxNS4yMzBaIiwiaWF0IjoxNTMwMzMwMTM1fQ.' +
            'SSsX2Byyo1B1bGxV8C3G4QldhE5iH87EY_1r21-bwbI'
        )
        .expect(200);

      const configurationBlocks = apiResponse.list;

      expect(configurationBlocks).to.be.an(Array);
      expect(configurationBlocks.length).to.be(0);
    });

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

      const configurationBlocks = apiResponse.list;

      expect(configurationBlocks).to.be.an(Array);
      expect(configurationBlocks.length).to.be(3);

      expect(configurationBlocks[1].type).to.be('metricbeat.modules');
      expect(configurationBlocks[1].config).to.eql({
        module: 'memcached',
        hosts: ['localhost:11211'],
      });

      expect(configurationBlocks[2].type).to.be('metricbeat.modules');
      expect(configurationBlocks[2].config).to.eql({
        module: 'memcached',
        hosts: ['localhost:4949'],
        'node.namespace': 'node',
      });
    });
  });
}
