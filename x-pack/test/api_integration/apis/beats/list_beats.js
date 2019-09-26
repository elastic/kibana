/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('list_beats', () => {
    const archive = 'beats/list';

    beforeEach('load beats archive', () => esArchiver.load(archive));
    afterEach('unload beats archive', () => esArchiver.unload(archive));

    it('should return all beats', async () => {
      const { body: apiResponse } = await supertest.get('/api/beats/agents').expect(200);

      const beatsFromApi = apiResponse.list;

      expect(beatsFromApi.length).to.be(4);
      expect(beatsFromApi.filter(beat => beat.hasOwnProperty('verified_on')).length).to.be(1);
      expect(beatsFromApi.find(beat => beat.hasOwnProperty('verified_on')).id).to.be('foo');
    });

    it('should not return access tokens', async () => {
      const { body: apiResponse } = await supertest.get('/api/beats/agents').expect(200);

      const beatsFromApi = apiResponse.list;

      expect(beatsFromApi.length).to.be(4);
      expect(beatsFromApi.filter(beat => beat.hasOwnProperty('access_token')).length).to.be(0);
    });
  });
}
