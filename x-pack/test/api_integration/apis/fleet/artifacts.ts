/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { createHash } from 'crypto';
import { FtrProviderContext } from '../../ftr_provider_context';

function binaryParser(res: any, callback: any) {
  res.setEncoding('binary');
  res.data = '';
  res.on('data', function(chunk: any) {
    res.data += chunk;
  });
  res.on('end', function() {
    callback(null, Buffer.from(res.data, 'binary'));
  });
}
export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('fleet_artifacts', () => {
    it('should return a 400 we try download anything else than a beat', async () => {
      await supertest.get(`/api/fleet/artifacts/kibana/test`).expect(400);
    });

    it('should return the artifact 200 if this is a valid request', async () => {
      const { body: apiResponse } = await supertest
        .get(`/api/fleet/artifacts/beats/filebeat/filebeat-7.3.2-i386.deb`)
        .buffer()
        .parse(binaryParser)
        .expect(200);

      const hash = createHash('sha512', apiResponse)
        .update(apiResponse)
        .digest('hex');

      expect(hash).to.be(
        'efb7e39ffbb943534ef77d4ecd9ef75ab9a2764368a966999f8a0e7b0e9f23600a48e85d7e25ca801cc830f45d3676586ff321d083c334ccd1414b67652ad5b4'
      );
    });
  });
}
