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

const params = {
  // mimikatz
  endpointID: '5f78bf8f-ddee-4890-ad61-6b5182309639',
  entityID: '3096',
  // powershell
  parent: {
    entityID: '2732',
  },
};

// eslint-disable-next-line import/no-default-export
export default function resolverAPIIntegrationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('Resolver', () => {
    before(() => esArchiver.load('endpoint/resolver/api_feature'));
    after(() => esArchiver.unload('endpoint/resolver/api_feature'));

    describe('related alerts endpoint', () => {
      it('should return details for the root node', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/resolver/${params.entityID}/alerts?legacyEndpointID=${params.endpointID}`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.alerts.length).to.eql(1);
        expect(body.pagination.next).to.not.eql(null);
        expect(body.pagination.total).to.eql(1);
        // default limit
        expect(body.pagination.limit).to.eql(100);
      });

      it('returns no values when there is no more data', async () => {
        let { body } = await supertest
          .get(
            `/api/endpoint/resolver/${params.entityID}/alerts?legacyEndpointID=${params.endpointID}`
          )
          .set(commonHeaders)
          .expect(200);

        ({ body } = await supertest
          // after is set to the document id of the last event so there shouldn't be any more after it
          .get(
            `/api/endpoint/resolver/${params.entityID}/alerts?legacyEndpointID=${params.endpointID}&after=${body.pagination.next}`
          )
          .set(commonHeaders)
          .expect(200));
        expect(body.alerts).be.empty();
        expect(body.pagination.next).to.eql(null);
        expect(body.pagination.total).to.eql(1);
      });

      it('should return the first page of information when the cursor is invalid', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/resolver/${params.entityID}/alerts?legacyEndpointID=${params.endpointID}&after=blah`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(1);
        expect(body.pagination.next).to.not.eql(null);
      });

      it('should error on invalid pagination values', async () => {
        await supertest
          .get(`/api/endpoint/resolver/${params.entityID}/alerts?limit=0`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${params.entityID}/alerts?limit=2000`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${params.entityID}/alerts?limit=-1`)
          .set(commonHeaders)
          .expect(400);
      });

      it('should not find any events', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/5555/alerts`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(0);
        expect(body.pagination.next).to.eql(null);
        expect(body.alerts).to.be.empty();
      });

      it('should return no results for an invalid endpoint ID', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/resolver/${params.entityID}/alerts?legacyEndpointID=foo`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(0);
        expect(body.pagination.next).to.eql(null);
        expect(body.alerts).to.be.empty();
      });
    });

    describe('related events endpoint', () => {
      it('should return details for the root node', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/resolver/${params.entityID}/related?legacyEndpointID=${params.endpointID}`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.events.length).to.eql(2);
        expect(body.pagination.next).to.not.eql(null);
        expect(body.pagination.total).to.eql(2);
        // default limit
        expect(body.pagination.limit).to.eql(100);
      });

      it('returns no values when there is no more data', async () => {
        let { body } = await supertest
          .get(
            `/api/endpoint/resolver/${params.entityID}/related?legacyEndpointID=${params.endpointID}`
          )
          .set(commonHeaders)
          .expect(200);

        ({ body } = await supertest
          // after is set to the document id of the last event so there shouldn't be any more after it
          .get(
            `/api/endpoint/resolver/${params.entityID}/related?legacyEndpointID=${params.endpointID}&after=${body.pagination.next}`
          )
          .set(commonHeaders)
          .expect(200));
        expect(body.events).be.empty();
        expect(body.pagination.next).to.eql(null);
        expect(body.pagination.total).to.eql(2);
      });

      it('should return the first page of information when the cursor is invalid', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/resolver/${params.entityID}/related?legacyEndpointID=${params.endpointID}&after=blah`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(2);
        expect(body.pagination.next).to.not.eql(null);
      });

      it('should error on invalid pagination values', async () => {
        await supertest
          .get(`/api/endpoint/resolver/${params.entityID}/related?limit=0`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${params.entityID}/related?limit=2000`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${params.entityID}/related?limit=-1`)
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
          .get(`/api/endpoint/resolver/${params.entityID}/related?legacyEndpointID=foo`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(0);
        expect(body.pagination.next).to.eql(null);
        expect(body.events).to.be.empty();
      });
    });

    describe('lifecycle events endpoint', () => {
      it('should return details for the root node', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/resolver/${params.entityID}?legacyEndpointID=${params.endpointID}&ancestors=5`
          )
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
          .get(`/api/endpoint/resolver/${params.entityID}?legacyEndpointID=${params.endpointID}`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.next).to.eql(params.parent.entityID);
      });

      it('should handle an ancestors param request', async () => {
        let { body } = await supertest
          .get(`/api/endpoint/resolver/${params.entityID}?legacyEndpointID=${params.endpointID}`)
          .set(commonHeaders)
          .expect(200);
        const next = body.pagination.next;

        ({ body } = await supertest
          .get(`/api/endpoint/resolver/${next}?legacyEndpointID=${params.endpointID}&ancestors=1`)
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
      it('returns child process lifecycle events', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/resolver/${params.parent.entityID}/children?legacyEndpointID=${params.endpointID}`
          )
          .set(commonHeaders)
          .expect(200);
        // powershell has 3 children
        expect(body.pagination.total).to.eql(3);
        expect(body.pagination.next).to.not.eql(null);
        // default limit
        expect(body.pagination.limit).to.eql(10);

        expect(body.children.length).to.eql(3);
        // the mimikatz child we're interested in is the 3 child of the powershell process
        expect(body.children[2].lifecycle.length).to.eql(2);
        expect(body.children[2].lifecycle[0].endgame.unique_pid).to.eql(params.entityID);
      });

      it('returns no values when there is no more data', async () => {
        let { body } = await supertest
          .get(
            `/api/endpoint/resolver/${params.parent.entityID}/children?legacyEndpointID=${params.endpointID}`
          )
          .set(commonHeaders)
          .expect(200);

        ({ body } = await supertest
          // after is set to the document id of the last event so there shouldn't be any more after it
          .get(
            `/api/endpoint/resolver/${params.parent.entityID}/children?legacyEndpointID=${params.endpointID}&after=${body.pagination.next}`
          )
          .set(commonHeaders)
          .expect(200));
        expect(body.children).be.empty();
        expect(body.pagination.next).to.eql(null);
        expect(body.pagination.total).to.eql(3);
      });

      it('returns the first page of information when the cursor is invalid', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/resolver/${params.parent.entityID}/children?legacyEndpointID=${params.endpointID}&after=blah`
          )
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(3);
        expect(body.pagination.next).to.not.eql(null);
      });

      it('errors on invalid pagination values', async () => {
        await supertest
          .get(`/api/endpoint/resolver/${params.parent.entityID}/children?limit=0`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${params.parent.entityID}/children?limit=2000`)
          .set(commonHeaders)
          .expect(400);
        await supertest
          .get(`/api/endpoint/resolver/${params.parent.entityID}/children?limit=-1`)
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
          .get(`/api/endpoint/resolver/${params.parent.entityID}/children?legacyEndpointID=foo`)
          .set(commonHeaders)
          .expect(200);
        expect(body.pagination.total).to.eql(0);
        expect(body.pagination.next).to.eql(null);
        expect(body.children).to.be.empty();
      });
    });
  });
}
