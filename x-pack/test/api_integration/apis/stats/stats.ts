/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('GET /api/stats', () => {
    describe('When status.allowAnonymous is true', () => {
      describe('when requesting extended stats', () => {
        it('returns extended stats payload for authenticated requests', async () => {
          const { body } = await supertest
            .get('/api/stats?extended=true')
            .set('kbn-xsrf', 'kibana')
            .expect(200);

          expect(body.cluster_uuid).to.be.a('string');
          expect(body.usage).to.be.an('object');
        });
        it('returns extended stats payload for unauthenticated requests', async () => {
          const { body } = await supertestWithoutAuth
            .get('/api/stats?extended=true')
            .set('kbn-xsrf', 'kibana')
            .expect(200);

          expect(body.cluster_uuid).to.be.a('string');
          expect(body.usage).to.be.an('object');
        });
      });
    });
  });
}
