/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('EPM - verification key id', () => {
    it('returns the verification key ID ', async () => {
      const res = await supertest
        .get('/api/fleet/epm/verification_key_id')
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(res.body.id).equal('d2a182a7b0e00c14');
    });
  });
}
