/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
const commonHeaders = {
  Accept: 'application/json',
  'kbn-xsrf': 'some-xsrf-token',
};

// eslint-disable-next-line import/no-default-export
export default function resolverAPIIntegrationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('Resolver api', function() {
    const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
    const rootEntityID = 'endgame-94042-' + endpointID;
    before(() => esArchiver.load('endpoint/resolver/api_feature'));
    after(() => esArchiver.unload('endpoint/resolver/api_feature'));
    it('should return details for the root node', async () => {
      const { body } = await supertest
        .get(`/api/endpoint/resolver/${rootEntityID}`)
        .set(commonHeaders)
        .expect(200);
      expect(body.lifecycle.length).to.eql(2);
      expect(body.events.length).to.eql(1);

      expect(body.pagination.total).to.eql(1);
      // default limit
      expect(body.pagination.limit).to.eql(100);
      expect(body.pagination.next).to.not.eql(null);
    });
    it('returns no values when there is no more data', async () => {
      const { body } = await supertest
        // after is set to the document id of the last event so there shouldn't be any more after it
        .get(`/api/endpoint/resolver/${rootEntityID}?after=t7QkNnABvfrOPnsMY1cl`)
        .set(commonHeaders)
        .expect(200);
      // TODO it's returning 1?
      expect(body.pagination.total).to.eql(0);
      expect(body.pagination.next).to.eql(null);
    });
    it('should return the first page of information when the cursor is in valid', async () => {
      const { body } = await supertest
        .get(`/api/endpoint/resolver/${rootEntityID}?after=blah`)
        .set(commonHeaders)
        .expect(200);
      expect(body.pagination.total).to.eql(1);
      expect(body.pagination.next).to.not.eql(null);
    });
    it('should error on invalid pagination values', async () => {
      await supertest
        .get(`/api/endpoint/resolver/${rootEntityID}?limit=0`)
        .set(commonHeaders)
        .expect(400);
      await supertest
        .get(`/api/endpoint/resolver/${rootEntityID}?limit=2000`)
        .set(commonHeaders)
        .expect(400);
      await supertest
        .get(`/api/endpoint/resolver/${rootEntityID}?page_size=-1`)
        .set(commonHeaders)
        .expect(400);
    });
    it('should not find any events', async () => {
      const { body } = await supertest
        .get(`/api/endpoint/resolver/5555`)
        .set(commonHeaders)
        .expect(200);
      expect(body.pagination.total).to.eql(0);
      expect(body.pagination.next).to.eql(null);
      expect(body.lifecycle).to.be.empty();
      expect(body.events).to.be.empty();
    });
    it('should return no results for an invalid entity ID', async () => {
      const { body } = await supertest
        .get(`/api/endpoint/resolver/endgame|slkdfjs`)
        .set(commonHeaders)
        .expect(200);
      expect(body.pagination.total).to.eql(0);
      expect(body.pagination.next).to.eql(null);
      expect(body.lifecycle).to.be.empty();
      expect(body.events).to.be.empty();
    });
  });
}
