/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('verify_beats', () => {
    const archive = 'beats/list';

    beforeEach('load beats archive', () => esArchiver.load(archive));
    afterEach('unload beats archive', () => esArchiver.unload(archive));

    it('verify the given beats', async () => {
      const { body: apiResponse } = await supertest
        .post(
          '/api/beats/agents/verify'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          beats: [
            { id: 'foo' },
            { id: 'bar' }
          ]
        })
        .expect(200);

      const beatsFromApi = apiResponse.beats;

      expect(beatsFromApi.length).to.be(2);
      expect(beatsFromApi.filter(beat => beat.hasOwnProperty('verified_on')).length).to.be(2);
      expect(beatsFromApi.map(beat => beat.id)).to.eql([ 'foo', 'bar' ]);
    });

    it('should not re-verify already-verified beats', async () => {

    });

    it('should return errors for non-existent beats', async () => {

    });

  });
}
