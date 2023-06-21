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

  describe('GET /api/status', () => {
    describe('When status.allowAnonymous is false', () => {
      it('returns full status payload for authenticated requests', async () => {
        const { body } = await supertest.get('/api/status').set('kbn-xsrf', 'kibana');

        expect(body.name).to.be.a('string');
        expect(body.uuid).to.be.a('string');
        expect(body.version.number).to.be.a('string');

        expect(body.status.overall).to.be.an('object');
        expect(body.status.core).to.be.an('object');
        expect(body.status.plugins).to.be.an('object');
      });
      it('returns redacted payload for unauthenticated requests', async () => {
        const { body } = await supertestWithoutAuth.get('/api/status').set('kbn-xsrf', 'kibana');

        expect(Object.keys(body)).to.eql(['status']);
        expect(body.status).to.be.an('object');
        expect(Object.keys(body.status)).to.eql(['overall']);
        expect(body.status.overall).to.be.an('object');
        expect(Object.keys(body.status.overall)).to.eql(['level']);
        expect(body.status.overall.level).to.be.a('string');
      });
    });
  });
}
