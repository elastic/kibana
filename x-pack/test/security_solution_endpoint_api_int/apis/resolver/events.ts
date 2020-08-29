/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { eventId } from '../../../../plugins/security_solution/common/endpoint/models/event';
import { ResolverRelatedEvents } from '../../../../plugins/security_solution/common/endpoint/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  Tree,
  RelatedEventCategory,
} from '../../../../plugins/security_solution/common/endpoint/generate_data';
import { Options, GeneratedTrees } from '../../services/resolver';
import { compareArrays } from './common';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const resolver = getService('resolverGenerator');
  const esArchiver = getService('esArchiver');

  const relatedEventsToGen = [
    { category: RelatedEventCategory.Driver, count: 2 },
    { category: RelatedEventCategory.File, count: 1 },
    { category: RelatedEventCategory.Registry, count: 1 },
  ];
  const relatedAlerts = 4;
  let resolverTrees: GeneratedTrees;
  let tree: Tree;
  const treeOptions: Options = {
    ancestors: 5,
    relatedEvents: relatedEventsToGen,
    relatedEventsOrdered: true,
    relatedAlerts,
    children: 3,
    generations: 2,
    percentTerminated: 100,
    percentWithRelated: 100,
    numTrees: 1,
    alwaysGenMaxChildrenPerNode: true,
    ancestryArraySize: 2,
  };

  describe('related events route', () => {
    before(async () => {
      await esArchiver.load('endpoint/resolver/api_feature');
      resolverTrees = await resolver.createTrees(treeOptions);
      // we only requested a single alert so there's only 1 tree
      tree = resolverTrees.trees[0];
    });
    after(async () => {
      await resolver.deleteData(resolverTrees);
      await esArchiver.unload('endpoint/resolver/api_feature');
    });

    describe('legacy events', () => {
      const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
      const entityID = '94042';
      const cursor = 'eyJ0aW1lc3RhbXAiOjE1ODE0NTYyNTUwMDAsImV2ZW50SUQiOiI5NDA0MyJ9';

      it('should return details for the root node', async () => {
        const { body }: { body: ResolverRelatedEvents } = await supertest
          .post(`/api/endpoint/resolver/${entityID}/events?legacyEndpointID=${endpointID}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.events.length).to.eql(1);
        expect(body.entityID).to.eql(entityID);
        expect(body.nextEvent).to.eql(null);
      });

      it('returns no values when there is no more data', async () => {
        const { body }: { body: ResolverRelatedEvents } = await supertest
          // after is set to the document id of the last event so there shouldn't be any more after it
          .post(
            `/api/endpoint/resolver/${entityID}/events?legacyEndpointID=${endpointID}&afterEvent=${cursor}`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.events).be.empty();
        expect(body.entityID).to.eql(entityID);
        expect(body.nextEvent).to.eql(null);
      });

      it('should return the first page of information when the cursor is invalid', async () => {
        const { body }: { body: ResolverRelatedEvents } = await supertest
          .post(
            `/api/endpoint/resolver/${entityID}/events?legacyEndpointID=${endpointID}&afterEvent=blah`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.entityID).to.eql(entityID);
        expect(body.nextEvent).to.eql(null);
      });

      it('should return no results for an invalid endpoint ID', async () => {
        const { body }: { body: ResolverRelatedEvents } = await supertest
          .post(`/api/endpoint/resolver/${entityID}/events?legacyEndpointID=foo`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.nextEvent).to.eql(null);
        expect(body.entityID).to.eql(entityID);
        expect(body.events).to.be.empty();
      });

      it('should error on invalid pagination values', async () => {
        await supertest
          .post(`/api/endpoint/resolver/${entityID}/events?events=0`)
          .set('kbn-xsrf', 'xxx')
          .expect(400);
        await supertest
          .post(`/api/endpoint/resolver/${entityID}/events?events=20000`)
          .set('kbn-xsrf', 'xxx')
          .expect(400);
        await supertest
          .post(`/api/endpoint/resolver/${entityID}/events?events=-1`)
          .set('kbn-xsrf', 'xxx')
          .expect(400);
      });
    });

    describe('endpoint events', () => {
      it('should not find any events', async () => {
        const { body }: { body: ResolverRelatedEvents } = await supertest
          .post(`/api/endpoint/resolver/5555/events`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.nextEvent).to.eql(null);
        expect(body.events).to.be.empty();
      });

      it('should return details for the root node', async () => {
        const { body }: { body: ResolverRelatedEvents } = await supertest
          .post(`/api/endpoint/resolver/${tree.origin.id}/events`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.events.length).to.eql(4);
        compareArrays(tree.origin.relatedEvents, body.events, true);
        expect(body.nextEvent).to.eql(null);
      });

      it('should allow for the events to be filtered', async () => {
        const filter = `event.category:"${RelatedEventCategory.Driver}"`;
        const { body }: { body: ResolverRelatedEvents } = await supertest
          .post(`/api/endpoint/resolver/${tree.origin.id}/events`)
          .set('kbn-xsrf', 'xxx')
          .send({
            filter,
          })
          .expect(200);
        expect(body.events.length).to.eql(2);
        compareArrays(tree.origin.relatedEvents, body.events);
        expect(body.nextEvent).to.eql(null);
        for (const event of body.events) {
          expect(event.event?.category).to.be(RelatedEventCategory.Driver);
        }
      });

      it('should return paginated results for the root node', async () => {
        let { body }: { body: ResolverRelatedEvents } = await supertest
          .post(`/api/endpoint/resolver/${tree.origin.id}/events?events=2`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.events.length).to.eql(2);
        compareArrays(tree.origin.relatedEvents, body.events);
        expect(body.nextEvent).not.to.eql(null);

        ({ body } = await supertest
          .post(
            `/api/endpoint/resolver/${tree.origin.id}/events?events=2&afterEvent=${body.nextEvent}`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200));
        expect(body.events.length).to.eql(2);
        compareArrays(tree.origin.relatedEvents, body.events);
        expect(body.nextEvent).to.not.eql(null);

        ({ body } = await supertest
          .post(
            `/api/endpoint/resolver/${tree.origin.id}/events?events=2&afterEvent=${body.nextEvent}`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200));
        expect(body.events).to.be.empty();
        expect(body.nextEvent).to.eql(null);
      });

      it('should return the first page of information when the cursor is invalid', async () => {
        const { body }: { body: ResolverRelatedEvents } = await supertest
          .post(`/api/endpoint/resolver/${tree.origin.id}/events?afterEvent=blah`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.events.length).to.eql(4);
        compareArrays(tree.origin.relatedEvents, body.events, true);
        expect(body.nextEvent).to.eql(null);
      });

      it('should sort the events in descending order', async () => {
        const { body }: { body: ResolverRelatedEvents } = await supertest
          .post(`/api/endpoint/resolver/${tree.origin.id}/events`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.events.length).to.eql(4);
        // these events are created in the order they are defined in the array so the newest one is
        // the last element in the array so let's reverse it
        const relatedEvents = tree.origin.relatedEvents.reverse();
        for (let i = 0; i < body.events.length; i++) {
          expect(body.events[i].event?.category).to.equal(relatedEvents[i].event.category);
          expect(eventId(body.events[i])).to.equal(relatedEvents[i].event.id);
        }
      });
    });
  });
}
