/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { SearchResponse } from 'elasticsearch';
import {
  entityIDSafeVersion,
  timestampSafeVersion,
} from '../../../../plugins/security_solution/common/endpoint/models/event';
import { eventsIndexPattern } from '../../../../plugins/security_solution/common/endpoint/constants';
import { ChildrenPaginationBuilder } from '../../../../plugins/security_solution/server/endpoint/routes/resolver/utils/children_pagination';
import { ChildrenQuery } from '../../../../plugins/security_solution/server/endpoint/routes/resolver/queries/children';
import {
  SafeResolverTree,
  SafeResolverEvent,
  SafeResolverChildren,
} from '../../../../plugins/security_solution/common/endpoint/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  Event,
  EndpointDocGenerator,
} from '../../../../plugins/security_solution/common/endpoint/generate_data';
import { InsertedEvents, processEventsIndex } from '../../services/resolver';
import { createAncestryArray } from './common';

export default function resolverAPIIntegrationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const resolver = getService('resolverGenerator');
  const generator = new EndpointDocGenerator('resolver');
  const es = getService('es');

  describe('Resolver children edge cases', () => {
    describe('info and exec children', () => {
      let origin: Event;
      let infoEvent: Event;
      let startEvent: Event;
      let execEvent: Event;
      let genData: InsertedEvents;

      before(async () => {
        // Construct the following tree:
        // Origin -> infoEvent -> startEvent -> execEvent
        origin = generator.generateEvent({
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        infoEvent = generator.generateEvent({
          parentEntityID: entityIDSafeVersion(origin),
          ancestry: createAncestryArray([origin]),
          eventType: ['info'],
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });

        startEvent = generator.generateEvent({
          timestamp: (timestampSafeVersion(infoEvent) ?? 0) + 100,
          parentEntityID: entityIDSafeVersion(infoEvent),
          ancestry: createAncestryArray([infoEvent, origin]),
          eventType: ['start'],
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });

        execEvent = generator.generateEvent({
          timestamp: (timestampSafeVersion(startEvent) ?? 0) + 100,
          parentEntityID: entityIDSafeVersion(startEvent),
          ancestry: createAncestryArray([startEvent, infoEvent]),
          eventType: ['change'],
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        genData = await resolver.insertEvents(
          [origin, infoEvent, startEvent, execEvent],
          processEventsIndex
        );
      });

      after(async () => {
        await resolver.deleteData(genData);
      });

      it('finds all the children of the origin', async () => {
        const { body }: { body: SafeResolverTree } = await supertest
          .get(`/api/endpoint/resolver/${origin.process?.entity_id}?children=100`)
          .expect(200);
        expect(body.children.childNodes.length).to.be(3);
        expect(body.children.childNodes[0].entityID).to.be(infoEvent.process?.entity_id);
        expect(body.children.childNodes[1].entityID).to.be(startEvent.process?.entity_id);
        expect(body.children.childNodes[2].entityID).to.be(execEvent.process?.entity_id);
      });
    });

    describe('duplicate process running events', () => {
      let origin: Event;
      let startEvent: Event;
      let infoEvent: Event;
      let execEvent: Event;
      let genData: InsertedEvents;

      before(async () => {
        // Construct the following tree:
        // Origin -> (infoEvent, startEvent, execEvent are all for the same node)
        origin = generator.generateEvent({
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        startEvent = generator.generateEvent({
          parentEntityID: entityIDSafeVersion(origin),
          ancestry: createAncestryArray([origin]),
          eventType: ['start'],
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });

        infoEvent = generator.generateEvent({
          timestamp: (timestampSafeVersion(startEvent) ?? 0) + 100,
          parentEntityID: entityIDSafeVersion(origin),
          ancestry: createAncestryArray([origin]),
          entityID: entityIDSafeVersion(startEvent),
          eventType: ['info'],
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });

        execEvent = generator.generateEvent({
          timestamp: (timestampSafeVersion(infoEvent) ?? 0) + 100,
          parentEntityID: entityIDSafeVersion(origin),
          ancestry: createAncestryArray([origin]),
          eventType: ['change'],
          entityID: entityIDSafeVersion(startEvent),
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        genData = await resolver.insertEvents(
          [origin, infoEvent, startEvent, execEvent],
          processEventsIndex
        );
      });

      after(async () => {
        await resolver.deleteData(genData);
      });

      it('only retrieves the start event for the child node', async () => {
        const childrenQuery = new ChildrenQuery(
          ChildrenPaginationBuilder.createBuilder(100),
          eventsIndexPattern
        );
        // [1] here gets the body portion of the array
        const [, query] = childrenQuery.buildMSearch(entityIDSafeVersion(origin) ?? '');
        const { body } = await es.search<SearchResponse<SafeResolverEvent>>({ body: query });
        expect(body.hits.hits.length).to.be(1);

        const event = body.hits.hits[0]._source;
        expect(entityIDSafeVersion(event)).to.be(startEvent.process?.entity_id);
        expect(event.event?.type).to.eql(['start']);
      });
    });

    describe('children api returns same node multiple times', () => {
      let origin: Event;
      let startEvent: Event;
      let infoEvent: Event;
      let execEvent: Event;
      let genData: InsertedEvents;

      before(async () => {
        // Construct the following tree:
        // Origin -> (infoEvent, startEvent, execEvent are all for the same node)
        origin = generator.generateEvent({
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        startEvent = generator.generateEvent({
          parentEntityID: entityIDSafeVersion(origin),
          ancestry: createAncestryArray([origin]),
          eventType: ['start'],
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });

        infoEvent = generator.generateEvent({
          timestamp: (timestampSafeVersion(startEvent) ?? 0) + 100,
          parentEntityID: entityIDSafeVersion(origin),
          ancestry: createAncestryArray([origin]),
          entityID: entityIDSafeVersion(startEvent),
          eventType: ['info'],
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });

        execEvent = generator.generateEvent({
          timestamp: (timestampSafeVersion(infoEvent) ?? 0) + 100,
          parentEntityID: entityIDSafeVersion(origin),
          ancestry: createAncestryArray([origin]),
          eventType: ['change'],
          entityID: entityIDSafeVersion(startEvent),
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        genData = await resolver.insertEvents(
          [origin, infoEvent, startEvent, execEvent],
          processEventsIndex
        );
      });

      after(async () => {
        await resolver.deleteData(genData);
      });

      it('retrieves the same node three times', async () => {
        let { body }: { body: SafeResolverChildren } = await supertest
          .get(`/api/endpoint/resolver/${origin.process?.entity_id}/children?children=1`)
          .expect(200);
        expect(body.childNodes.length).to.be(1);
        expect(body.nextChild).to.not.be(null);
        expect(body.childNodes[0].entityID).to.be(startEvent.process?.entity_id);
        expect(body.childNodes[0].lifecycle[0].event?.type).to.eql(startEvent.event?.type);

        ({ body } = await supertest
          .get(
            `/api/endpoint/resolver/${origin.process?.entity_id}/children?children=1&afterChild=${body.nextChild}`
          )
          .expect(200));
        expect(body.childNodes.length).to.be(1);
        expect(body.nextChild).to.not.be(null);
        expect(body.childNodes[0].entityID).to.be(infoEvent.process?.entity_id);
        expect(body.childNodes[0].lifecycle[1].event?.type).to.eql(infoEvent.event?.type);

        ({ body } = await supertest
          .get(
            `/api/endpoint/resolver/${origin.process?.entity_id}/children?children=1&afterChild=${body.nextChild}`
          )
          .expect(200));
        expect(body.childNodes.length).to.be(1);
        expect(body.nextChild).to.not.be(null);
        expect(body.childNodes[0].entityID).to.be(infoEvent.process?.entity_id);
        expect(body.childNodes[0].lifecycle[2].event?.type).to.eql(execEvent.event?.type);

        ({ body } = await supertest
          .get(
            `/api/endpoint/resolver/${origin.process?.entity_id}/children?children=1&afterChild=${body.nextChild}`
          )
          .expect(200));
        expect(body.childNodes.length).to.be(0);
        expect(body.nextChild).to.be(null);
      });
    });
  });
}
