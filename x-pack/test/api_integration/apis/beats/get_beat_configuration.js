/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('get_beat_configuration', () => {
    const archive = 'beats/list';

    beforeEach('load beats archive', () => esArchiver.load(archive));
    afterEach('unload beats archive', () => esArchiver.unload(archive));

    it('should return merged configuration for the beat', async () => {
      const { body: apiResponse } = await supertest
        .get(
          '/api/beats/agent/foo/configuration'
        )
        .set('kbn-beats-access-token', '93c4a4dd08564c189a7ec4e4f046b975')
        .expect(200);

      const configurationBlocks = apiResponse.configuration_blocks;

      expect(configurationBlocks).to.be.an(Array);
      expect(configurationBlocks.length).to.be(3);

      expect(configurationBlocks[0].type).to.be('output');
      expect(configurationBlocks[0].data).to.be('elasticsearch:\n    hosts: ["localhost:9200"]\n    username: ...');

      expect(configurationBlocks[1].type).to.be('metricbeat.modules');
      expect(configurationBlocks[1].data).to.be('module: memcached\nhosts: ["localhost:11211"]');

      expect(configurationBlocks[2].type).to.be('metricbeat.modules');
      expect(configurationBlocks[2].data).to.be('module: munin\nhosts: ["localhost:4949"]\nnode.namespace: node');
    });
  });
}