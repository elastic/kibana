/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
const commonHeaders = {
  accept: 'application/json',
  'kbn-xsrf': 'some-xsrf-token',
};

// eslint-disable-next-line import/no-default-export
export default function resolverAPIIntegrationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('Resolver', () => {
    before(() => esArchiver.load('endpoint/resolver/api_feature'));
    after(() => esArchiver.unload('endpoint/resolver/api_feature'));

    describe('related events endpoint', () => {
      const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
      const entityID = '94042';
      const cursor = 'eyJ0aW1lc3RhbXAiOjE1ODE0NTYyNTUwMDAsImV2ZW50SUQiOiI5NDA0MyJ9';

      it('should return details for the root node', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/${entityID}/related?legacyEndpointID=${endpointID}`)
          .set(commonHeaders)
          .expect(200);
        expect(body.events.length).to.eql(1);
        expect(body.pagination.next).to.eql(cursor);
        expect(body.pagination.total).to.eql(1);
        // default limit
        expect(body.pagination.limit).to.eql(100);
      });

      it('returns no values when there is no more data', async () => {
        const { body } = await supertest
          // after is set to the document id of the last event so there shouldn't be any more after it
          .get(
            `/api/endpoint/resolver/${entityID}/related?legacyEndpointID=${endpointID}&after=${cursor}`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.events).be.empty();
        expect(body.pagination.next).to.eql(null);
        expect(body.pagination.total).to.eql(1);
      });

      it('should return the first page of information when the cursor is invalid', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/resolver/${entityID}/related?legacyEndpointID=${endpointID}&after=blah`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(1);
        expect(body.pagination.next).to.not.eql(null);
      });

      it('should error on invalid pagination values', async () => {
        await supertest
          .get(`/api/endpoint/resolver/${entityID}/related?limit=0`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${entityID}/related?limit=2000`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${entityID}/related?limit=-1`)
          .set(commonHeaders)
          .expect(400);
      });

      it('should not find any events', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/5555/related`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(0);
        expect(body.pagination.next).to.eql(null);
        expect(body.events).to.be.empty();
      });

      it('should return no results for an invalid endpoint ID', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/${entityID}/related?legacyEndpointID=foo`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(0);
        expect(body.pagination.next).to.eql(null);
        expect(body.events).to.be.empty();
      });
    });

    describe('lifecycle events endpoint', () => {
      const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
      const entityID = '94042';

      it('should return details for the root node', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/${entityID}?legacyEndpointID=${endpointID}&ancestors=5`)
          .set(commonHeaders)
          .expect(200);
        expect(body.lifecycle.length).to.eql(2);
        expect(body.ancestors.length).to.eql(1);
        expect(body.pagination.next).to.eql(null);
        // 5 is default parameter
        expect(body.pagination.ancestors).to.eql(5);
      });

      it('should have a populated next parameter', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/${entityID}?legacyEndpointID=${endpointID}`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.next).to.eql('94041');
      });

      it('should handle an ancestors param request', async () => {
        let { body } = await supertest
          .get(`/api/endpoint/resolver/${entityID}?legacyEndpointID=${endpointID}`)
          .set(commonHeaders)
          .expect(200);
        const next = body.pagination.next;

        ({ body } = await supertest
          .get(`/api/endpoint/resolver/${next}?legacyEndpointID=${endpointID}&ancestors=1`)
          .set(commonHeaders)
          .expect(200));
        expect(body.lifecycle.length).to.eql(1);
        expect(body.ancestors.length).to.eql(0);
        expect(body.pagination.next).to.eql(null);
      });

      it('should handle an invalid id', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/alskdjflasj`)
          .set(commonHeaders)
          .expect(200);
        expect(body.lifecycle.length).to.eql(0);
        expect(body.ancestors.length).to.eql(0);
        expect(body.pagination.next).to.eql(null);
      });
    });

    describe('children endpoint', () => {
      const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
      const entityID = '94041';
      const cursor = 'eyJ0aW1lc3RhbXAiOjE1ODE0NTYyNTUwMDAsImV2ZW50SUQiOiI5NDA0MiJ9';

      it('returns child process lifecycle events', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/${entityID}/children?legacyEndpointID=${endpointID}`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(1);
        expect(body.pagination.next).to.eql(cursor);
        // default limit
        expect(body.pagination.limit).to.eql(10);

        expect(body.children.length).to.eql(1);
        expect(body.children[0].lifecycle.length).to.eql(2);
        expect(body.children[0].lifecycle[0].endgame.unique_pid).to.eql(94042);
      });

      it('returns no values when there is no more data', async () => {
        const { body } = await supertest
          // after is set to the document id of the last event so there shouldn't be any more after it
          .get(
            `/api/endpoint/resolver/${entityID}/children?legacyEndpointID=${endpointID}&after=${cursor}`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.children).be.empty();
        expect(body.pagination.next).to.eql(null);
        expect(body.pagination.total).to.eql(1);
      });

      it('returns the first page of information when the cursor is invalid', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/resolver/${entityID}/children?legacyEndpointID=${endpointID}&after=blah`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(1);
        expect(body.pagination.next).to.not.eql(null);
      });

      it('errors on invalid pagination values', async () => {
        await supertest
          .get(`/api/endpoint/resolver/${entityID}/children?limit=0`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${entityID}/children?limit=2000`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${entityID}/children?limit=-1`)
          .set(commonHeaders)
          .expect(400);
      });

      it('returns empty events without a matching entity id', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/5555/children`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(0);
        expect(body.pagination.next).to.eql(null);
        expect(body.children).to.be.empty();
      });

      it('returns empty events with an invalid endpoint id', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/${entityID}/children?legacyEndpointID=foo`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(0);
        expect(body.pagination.next).to.eql(null);
        expect(body.children).to.be.empty();
      });
    });
  });
}
