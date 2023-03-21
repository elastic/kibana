/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { JsonObject } from '@kbn/utility-types';
import { eventsIndexPattern } from '@kbn/security-solution-plugin/common/endpoint/constants';
import {
  eventIDSafeVersion,
  parentEntityIDSafeVersion,
  timestampAsDateSafeVersion,
} from '@kbn/security-solution-plugin/common/endpoint/models/event';
import { ResolverPaginatedEvents } from '@kbn/security-solution-plugin/common/endpoint/types';
import {
  Tree,
  RelatedEventCategory,
} from '@kbn/security-solution-plugin/common/endpoint/generate_data';
import { FtrProviderContext } from '../../ftr_provider_context';
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
    let entityIDFilterArray: JsonObject[] | undefined;
    let entityIDFilter: string | undefined;
    before(async () => {
      resolverTrees = await resolver.createTrees(treeOptions);
      // we only requested a single alert so there's only 1 tree
      tree = resolverTrees.trees[0];
      entityIDFilterArray = [
        { term: { 'process.entity_id': tree.origin.id } },
        { bool: { must_not: { term: { 'event.category': 'process' } } } },
      ];
      entityIDFilter = JSON.stringify({
        bool: {
          filter: entityIDFilterArray,
        },
      });
    });
    after(async () => {
      await resolver.deleteData(resolverTrees);
    });

    it('should filter events by event.id', async () => {
      const filter = JSON.stringify({
        bool: {
          filter: [{ term: { 'event.id': tree.origin.relatedEvents[0]?.event?.id } }],
        },
      });
      const { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter,
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
        })
        .expect(200);
      expect(body.events.length).to.eql(1);
      expect(tree.origin.relatedEvents[0]?.event?.id).to.eql(body.events[0].event?.id);
      expect(body.nextEvent).to.eql(null);
    });

    it('should not find any events when given an invalid entity id', async () => {
      const filter = JSON.stringify({
        bool: {
          filter: [{ term: { 'process.entity_id': '5555' } }],
        },
      });
      const { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter,
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
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
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
        })
        .expect(200);
      expect(body.events.length).to.eql(4);
      compareArrays(tree.origin.relatedEvents, body.events, true);
      expect(body.nextEvent).to.eql(null);
    });

    it('should allow for the events to be filtered', async () => {
      const filter = JSON.stringify({
        bool: {
          filter: [
            { term: { 'event.category': RelatedEventCategory.Driver } },
            ...(entityIDFilterArray ?? []),
          ],
        },
      });
      const { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter,
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
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
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
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
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
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
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
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
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
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
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
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

    it('should only return data within the specified timeRange', async () => {
      const from =
        timestampAsDateSafeVersion(tree.origin.relatedEvents[0])?.toISOString() ??
        new Date(0).toISOString();
      const to = from;
      const { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: entityIDFilter,
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from,
            to,
          },
        })
        .expect(200);
      expect(body.events.length).to.eql(1);
      expect(tree.origin.relatedEvents[0]?.event?.id).to.eql(body.events[0].event?.id);
      expect(body.nextEvent).to.eql(null);
    });

    it('should not find events when using an incorrect index pattern', async () => {
      const { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: entityIDFilter,
          indexPatterns: ['doesnotexist-*'],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
        })
        .expect(200);
      expect(body.events.length).to.eql(0);
      expect(body.nextEvent).to.eql(null);
    });

    it('should retrieve lifecycle events for multiple ids', async () => {
      const originParentID = parentEntityIDSafeVersion(tree.origin.lifecycle[0]) ?? '';
      expect(originParentID).to.not.be('');
      const { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: JSON.stringify({
            bool: {
              filter: [
                { terms: { 'process.entity_id': [tree.origin.id, originParentID] } },
                { term: { 'event.category': 'process' } },
              ],
            },
          }),
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
        })
        .expect(200);
      // 2 lifecycle events for the origin and 2 for the origin's parent
      expect(body.events.length).to.eql(4);
      expect(body.nextEvent).to.eql(null);
    });

    it('should paginate lifecycle events for multiple ids', async () => {
      const originParentID = parentEntityIDSafeVersion(tree.origin.lifecycle[0]) ?? '';
      expect(originParentID).to.not.be('');
      let { body }: { body: ResolverPaginatedEvents } = await supertest
        .post(`/api/endpoint/resolver/events`)
        .query({ limit: 2 })
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: JSON.stringify({
            bool: {
              filter: [
                { terms: { 'process.entity_id': [tree.origin.id, originParentID] } },
                { term: { 'event.category': 'process' } },
              ],
            },
          }),
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
        })
        .expect(200);
      expect(body.events.length).to.eql(2);
      expect(body.nextEvent).not.to.eql(null);

      ({ body } = await supertest
        .post(`/api/endpoint/resolver/events`)
        .query({ limit: 3, afterEvent: body.nextEvent })
        .set('kbn-xsrf', 'xxx')
        .send({
          filter: JSON.stringify({
            bool: {
              filter: [
                { terms: { 'process.entity_id': [tree.origin.id, originParentID] } },
                { term: { 'event.category': 'process' } },
              ],
            },
          }),
          indexPatterns: [eventsIndexPattern],
          timeRange: {
            from: tree.startTime,
            to: tree.endTime,
          },
        })
        .expect(200));

      expect(body.events.length).to.eql(2);
      expect(body.nextEvent).to.eql(null);
    });
  });
}
