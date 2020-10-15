/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { entityIDSafeVersion } from '../../../../plugins/security_solution/common/endpoint/models/event';
import { eventsIndexPattern } from '../../../../plugins/security_solution/common/endpoint/constants';
import {
  SafeResolverTree,
  ResolverEntityIndex,
} from '../../../../plugins/security_solution/common/endpoint/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  EndpointDocGenerator,
  Event,
} from '../../../../plugins/security_solution/common/endpoint/generate_data';
import { InsertedEvents, processEventsIndex } from '../../services/resolver';
import { createAncestryArray } from './common';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const resolver = getService('resolverGenerator');
  const generator = new EndpointDocGenerator('resolver');

  const setEntityIDEmptyString = (event: Event) => {
    if (event.process?.entity_id) {
      event.process.entity_id = '';
    }
  };

  describe('Resolver handling of entity ids', () => {
    describe('entity api', () => {
      let origin: Event;
      let genData: InsertedEvents;
      before(async () => {
        origin = generator.generateEvent({
          parentEntityID: 'a',
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        setEntityIDEmptyString(origin);
        genData = await resolver.insertEvents([origin], processEventsIndex);
      });

      after(async () => {
        await resolver.deleteData(genData);
      });

      it('excludes events that have an empty entity_id field', async () => {
        const { body }: { body: ResolverEntityIndex } = await supertest.get(
          // using the same indices value here twice to force the query parameter to be an array
          // for some reason using supertest's query() function doesn't construct a parsable array
          `/api/endpoint/resolver/entity?_id=${genData.eventsInfo[0]._id}&indices=${eventsIndexPattern}&indices=${eventsIndexPattern}`
        );
        expect(body).to.be.empty();
      });
    });

    describe('children', () => {
      let origin: Event;
      let childNoEntityID: Event;
      let childWithEntityID: Event;
      let events: Event[];
      let genData: InsertedEvents;

      before(async () => {
        // construct a tree with an origin and two direct children. One child will not have an entity_id. That child
        // should not be returned by the backend.
        origin = generator.generateEvent({
          entityID: 'a',
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        childNoEntityID = generator.generateEvent({
          parentEntityID: entityIDSafeVersion(origin),
          ancestry: createAncestryArray([origin]),
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        // force it to be empty
        setEntityIDEmptyString(childNoEntityID);

        childWithEntityID = generator.generateEvent({
          entityID: 'b',
          parentEntityID: entityIDSafeVersion(origin),
          ancestry: createAncestryArray([origin]),
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        events = [origin, childNoEntityID, childWithEntityID];
        genData = await resolver.insertEvents(events, processEventsIndex);
      });

      after(async () => {
        await resolver.deleteData(genData);
      });

      it('does not find children without a process entity_id', async () => {
        const { body }: { body: SafeResolverTree } = await supertest
          .get(`/api/endpoint/resolver/${origin.process?.entity_id}`)
          .expect(200);
        expect(body.children.childNodes.length).to.be(1);
        expect(body.children.childNodes[0].entityID).to.be(childWithEntityID.process?.entity_id);
      });
    });

    describe('ancestors', () => {
      let origin: Event;
      let ancestor1: Event;
      let ancestor2: Event;
      let ancestorNoEntityID: Event;
      let events: Event[];
      let genData: InsertedEvents;

      before(async () => {
        // construct a tree with an origin that has two ancestors. The origin will have an empty string as one of the
        // entity_ids in the ancestry array. This is to make sure that the backend will not query for that event.
        ancestor2 = generator.generateEvent({
          entityID: '2',
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        ancestor1 = generator.generateEvent({
          entityID: '1',
          parentEntityID: entityIDSafeVersion(ancestor2),
          ancestry: createAncestryArray([ancestor2]),
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });

        // we'll insert an event that doesn't have an entity id so if the backend does search for it, it should be
        // returned and our test should fail
        ancestorNoEntityID = generator.generateEvent({
          ancestry: createAncestryArray([ancestor2]),
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        setEntityIDEmptyString(ancestorNoEntityID);

        origin = generator.generateEvent({
          entityID: 'a',
          parentEntityID: entityIDSafeVersion(ancestor1),
          ancestry: ['', ...createAncestryArray([ancestor2])],
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });

        events = [origin, ancestor1, ancestor2, ancestorNoEntityID];
        genData = await resolver.insertEvents(events, processEventsIndex);
      });

      after(async () => {
        await resolver.deleteData(genData);
      });

      it('does not query for ancestors that have an empty string for the entity_id', async () => {
        const { body }: { body: SafeResolverTree } = await supertest
          .get(`/api/endpoint/resolver/${origin.process?.entity_id}`)
          .expect(200);
        expect(body.ancestry.ancestors.length).to.be(1);
        expect(body.ancestry.ancestors[0].entityID).to.be(ancestor2.process?.entity_id);
      });
    });
  });
}
