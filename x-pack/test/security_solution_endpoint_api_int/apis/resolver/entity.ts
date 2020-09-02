/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { eventsIndexPattern } from '../../../../plugins/security_solution/common/endpoint/constants';
import {
  ResolverTree,
  ResolverEntityIndex,
} from '../../../../plugins/security_solution/common/endpoint/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  EndpointDocGenerator,
  Event,
} from '../../../../plugins/security_solution/common/endpoint/generate_data';
import { InsertedEvents } from '../../services/resolver';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const resolver = getService('resolverGenerator');
  const generator = new EndpointDocGenerator('resolver');

  describe('Resolver tests for the entity route', () => {
    describe('entity api', () => {
      let origin: Event;
      let genData: InsertedEvents;
      before(async () => {
        origin = generator.generateEvent({ parentEntityID: 'a' });
        genData = await resolver.insertEvents([origin]);
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
        expect(body).to.not.be.empty();
      });
    });

    // TODO add test for signals index not having the process.entity_id in the mapping
  });
}
