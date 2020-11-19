/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { eventIDSafeVersion } from '../../../../plugins/security_solution/common/endpoint/models/event';
import { ResolverPaginatedEvents } from '../../../../plugins/security_solution/common/endpoint/types';
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

  describe('event route', () => {
    let entityIDFilter: string | undefined;
    before(async () => {
      resolverTrees = await resolver.createTrees(treeOptions);
      // we only requested a single alert so there's only 1 tree
      tree = resolverTrees.trees[0];
      entityIDFilter = `process.entity_id:"${tree.origin.id}" and not event.category:"process"`;
    });
    after(async () => {
      await resolver.deleteData(resolverTrees);
    });

    it('should filter events by event.id', async () => {
      const { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: `event.id:"${tree.origin.relatedEvents[0]?.event?.id}"`,
        })
        .expect(200);
      expect(body.events.length).to.eql(1);
      expect(tree.origin.relatedEvents[0]?.event?.id).to.eql(body.events[0].event?.id);
      expect(body.nextEvent).to.eql(null);
    });

    it('should not find any events when given an invalid entity id', async () => {
      const { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: 'process.entity_id:"5555"',
        })
        .expect(200);
      expect(body.nextEvent).to.eql(null);
      expect(body.events).to.be.empty();
    });

    it('should return related events for the root node', async () => {
      const { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: entityIDFilter,
        })
        .expect(200);
      expect(body.events.length).to.eql(4);
      compareArrays(tree.origin.relatedEvents, body.events, true);
      expect(body.nextEvent).to.eql(null);
    });

    it('should allow for the events to be filtered', async () => {
      const filter = `event.category:"${RelatedEventCategory.Driver}" and ${entityIDFilter}`;
      const { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events`)
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
      let { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events?limit=2`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: entityIDFilter,
        })
        .expect(200);
      expect(body.events.length).to.eql(2);
      compareArrays(tree.origin.relatedEvents, body.events);
      expect(body.nextEvent).not.to.eql(null);

      ({ body } = await supertest
        .post(`/api/endpoint/resolver/events?limit=2&afterEvent=${body.nextEvent}`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: entityIDFilter,
        })
        .expect(200));
      expect(body.events.length).to.eql(2);
      compareArrays(tree.origin.relatedEvents, body.events);
      expect(body.nextEvent).to.not.eql(null);

      ({ body } = await supertest
        .post(`/api/endpoint/resolver/events?limit=2&afterEvent=${body.nextEvent}`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: entityIDFilter,
        })
        .expect(200));
      expect(body.events).to.be.empty();
      expect(body.nextEvent).to.eql(null);
    });

    it('should return the first page of information when the cursor is invalid', async () => {
      const { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events?afterEvent=blah`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: entityIDFilter,
        })
        .expect(200);
      expect(body.events.length).to.eql(4);
      compareArrays(tree.origin.relatedEvents, body.events, true);
      expect(body.nextEvent).to.eql(null);
    });

    it('should sort the events in descending order', async () => {
      const { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: entityIDFilter,
        })
        .expect(200);
      expect(body.events.length).to.eql(4);
      // these events are created in the order they are defined in the array so the newest one is
      // the last element in the array so let's reverse it
      const relatedEvents = tree.origin.relatedEvents.reverse();
      for (let i = 0; i < body.events.length; i++) {
        expect(body.events[i].event?.category).to.equal(relatedEvents[i].event?.category);
        expect(eventIDSafeVersion(body.events[i])).to.equal(relatedEvents[i].event?.id);
      }
    });
  });
}
