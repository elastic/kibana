/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { SearchResponse } from 'elasticsearch';
import { entityId } from '../../../../plugins/security_solution/common/endpoint/models/event';
import { eventsIndexPattern } from '../../../../plugins/security_solution/common/endpoint/constants';
import { PaginationBuilder } from '../../../../plugins/security_solution/server/endpoint/routes/resolver/utils/pagination';
import { ChildrenQuery } from '../../../../plugins/security_solution/server/endpoint/routes/resolver/queries/children';
import {
  ResolverTree,
  ResolverEvent,
} from '../../../../plugins/security_solution/common/endpoint/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  Event,
  EndpointDocGenerator,
} from '../../../../plugins/security_solution/common/endpoint/generate_data';
import { InsertedEvents } from '../../services/resolver';

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
        origin = generator.generateEvent();
        infoEvent = generator.generateEvent({
          parentEntityID: origin.process.entity_id,
          ancestry: [origin.process.entity_id],
          eventType: ['info'],
        });

        startEvent = generator.generateEvent({
          parentEntityID: infoEvent.process.entity_id,
          ancestry: [infoEvent.process.entity_id, origin.process.entity_id],
          eventType: ['start'],
        });

        execEvent = generator.generateEvent({
          parentEntityID: startEvent.process.entity_id,
          ancestry: [startEvent.process.entity_id, infoEvent.process.entity_id],
          eventType: ['change'],
        });
        genData = await resolver.insertEvents([origin, infoEvent, startEvent, execEvent]);
      });

      after(async () => {
        await resolver.deleteData(genData);
      });

      it('finds all the children of the origin', async () => {
        const { body }: { body: ResolverTree } = await supertest
          .get(`/api/endpoint/resolver/${origin.process.entity_id}?children=100`)
          .expect(200);
        expect(body.children.childNodes.length).to.be(3);
        expect(body.children.childNodes[0].entityID).to.be(infoEvent.process.entity_id);
        expect(body.children.childNodes[1].entityID).to.be(startEvent.process.entity_id);
        expect(body.children.childNodes[2].entityID).to.be(execEvent.process.entity_id);
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
        origin = generator.generateEvent();
        startEvent = generator.generateEvent({
          parentEntityID: origin.process.entity_id,
          ancestry: [origin.process.entity_id],
          eventType: ['start'],
        });

        infoEvent = generator.generateEvent({
          parentEntityID: origin.process.entity_id,
          ancestry: [origin.process.entity_id],
          entityID: startEvent.process.entity_id,
          eventType: ['info'],
        });

        execEvent = generator.generateEvent({
          parentEntityID: origin.process.entity_id,
          ancestry: [origin.process.entity_id],
          eventType: ['change'],
          entityID: startEvent.process.entity_id,
        });
        genData = await resolver.insertEvents([origin, infoEvent, startEvent, execEvent]);
      });

      after(async () => {
        await resolver.deleteData(genData);
      });

      it('only retrieves the start event for the child node', async () => {
        const childrenQuery = new ChildrenQuery(
          PaginationBuilder.createBuilder(100),
          eventsIndexPattern
        );
        // [1] here gets the body portion of the array
        const [, query] = childrenQuery.buildMSearch(origin.process.entity_id);
        const { body } = await es.search<SearchResponse<ResolverEvent>>({ body: query });
        expect(body.hits.hits.length).to.be(1);

        const event = body.hits.hits[0]._source;
        expect(entityId(event)).to.be(startEvent.process.entity_id);
        expect(event.event?.type).to.eql(['start']);
      });
    });
  });
}
