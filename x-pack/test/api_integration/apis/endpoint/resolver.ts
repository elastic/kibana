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
    before(async () => await esArchiver.load('endpoint/resolver/api_feature'));
    after(async () => await esArchiver.unload('endpoint/resolver/api_feature'));

    describe('related events endpoint', () => {
      const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
      const entityID = '94042';
      const cursor = 'eyJ0aW1lc3RhbXAiOjE1ODE0NTYyNTUwMDAsImV2ZW50SUQiOiI5NDA0MyJ9';

      it('should return details for the root node', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/${entityID}/events?legacyEndpointID=${endpointID}`)
          .set(commonHeaders)
          .expect(200);
        expect(body.events.length).to.eql(1);
        expect(body.pagination.nextEvent).to.eql(null);
      });

      it('returns no values when there is no more data', async () => {
        const { body } = await supertest
          // after is set to the document id of the last event so there shouldn't be any more after it
          .get(
            `/api/endpoint/resolver/${entityID}/events?legacyEndpointID=${endpointID}&afterEvent=${cursor}`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.events).be.empty();
        expect(body.pagination.nextEvent).to.eql(null);
      });

      it('should return the first page of information when the cursor is invalid', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/resolver/${entityID}/events?legacyEndpointID=${endpointID}&afterEvent=blah`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.nextEvent).to.eql(null);
      });

      it('should error on invalid pagination values', async () => {
        await supertest
          .get(`/api/endpoint/resolver/${entityID}/events?events=0`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${entityID}/events?events=2000`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${entityID}/events?events=-1`)
          .set(commonHeaders)
          .expect(400);
      });

      it('should not find any events', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/5555/events`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.nextEvent).to.eql(null);
        expect(body.events).to.be.empty();
      });

      it('should return no results for an invalid endpoint ID', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/${entityID}/events?legacyEndpointID=foo`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.nextEvent).to.eql(null);
        expect(body.events).to.be.empty();
      });
    });

    describe('lifecycle events endpoint', () => {
      const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
      const entityID = '94042';

      it('should return details for the root node', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/resolver/${entityID}/ancestry?legacyEndpointID=${endpointID}&ancestors=5`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.lifecycle.length).to.eql(2);
        expect(body.parent).not.to.eql(null);
        expect(body.pagination.nextAncestor).to.eql(null);
      });

      it('should have a populated next parameter', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/${entityID}/ancestry?legacyEndpointID=${endpointID}`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.nextAncestor).to.eql('94041');
      });

      it('should handle an ancestors param request', async () => {
        let { body } = await supertest
          .get(`/api/endpoint/resolver/${entityID}/ancestry?legacyEndpointID=${endpointID}`)
          .set(commonHeaders)
          .expect(200);
        const next = body.pagination.nextAncestor;

        ({ body } = await supertest
          .get(`/api/endpoint/resolver/${next}/ancestry?legacyEndpointID=${endpointID}&ancestors=1`)
          .set(commonHeaders)
          .expect(200));
        expect(body.lifecycle.length).to.eql(1);
        expect(body.pagination.nextAncestor).to.eql(null);
      });

      it('should handle an invalid id', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/alskdjflasj/ancestry`)
          .set(commonHeaders)
          .expect(200);
        expect(body.lifecycle.length).to.eql(0);
        expect(body.pagination.nextAncestor).to.eql(null);
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
        expect(body.children.length).to.eql(1);
        expect(body.children[0].lifecycle.length).to.eql(2);
        expect(body.children[0].lifecycle[0].endgame.unique_pid).to.eql(94042);
      });

      it('returns multiple levels of child process lifecycle events', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/93802/children?legacyEndpointID=${endpointID}&generations=3`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.nextChild).to.be(null);
        expect(body.children[0].pagination.nextChild).to.be(null);

        expect(body.children.length).to.eql(8);
        expect(body.children[0].children[0].lifecycle.length).to.eql(2);
        expect(body.children[0].lifecycle[0].endgame.unique_pid).to.eql(93932);
      });

      it('returns no values when there is no more data', async () => {
        const { body } = await supertest
          // after is set to the document id of the last event so there shouldn't be any more after it
          .get(
            `/api/endpoint/resolver/${entityID}/children?legacyEndpointID=${endpointID}&afterChild=${cursor}`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.children).be.empty();
        expect(body.pagination.nextChild).to.eql(null);
      });

      it('returns the first page of information when the cursor is invalid', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/resolver/${entityID}/children?legacyEndpointID=${endpointID}&afterChild=blah`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.children.length).to.eql(1);
        expect(body.pagination.nextChild).to.be(null);
      });

      it('errors on invalid pagination values', async () => {
        await supertest
          .get(`/api/endpoint/resolver/${entityID}/children?children=0`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${entityID}/children?children=2000`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${entityID}/children?children=-1`)
          .set(commonHeaders)
          .expect(400);
      });

      it('returns empty events without a matching entity id', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/5555/children`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.nextChild).to.eql(null);
        expect(body.children).to.be.empty();
      });

      it('returns empty events with an invalid endpoint id', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/${entityID}/children?legacyEndpointID=foo`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.nextChild).to.eql(null);
        expect(body.children).to.be.empty();
      });
    });

    describe('tree endpoint', () => {
      const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';

      it('returns ancestors, events, children, and current process lifecycle', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/93933?legacyEndpointID=${endpointID}`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.nextAncestor).to.equal(null);
        expect(body.pagination.nextEvent).to.equal(null);
        expect(body.pagination.nextChild).to.equal(null);
        expect(body.children.length).to.equal(0);
        expect(body.events.length).to.equal(0);
        expect(body.lifecycle.length).to.equal(2);
      });
    });
  });
}
