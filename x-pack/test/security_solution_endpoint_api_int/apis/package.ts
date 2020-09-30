/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { SearchResponse } from 'elasticsearch';
import { eventsIndexPattern } from '../../../plugins/security_solution/common/endpoint/constants';
import {
  EndpointDocGenerator,
  Event,
} from '../../../plugins/security_solution/common/endpoint/generate_data';
import { FtrProviderContext } from '../ftr_provider_context';
import { InsertedEvents, processEventsIndex } from '../services/resolver';

interface EventIngested {
  event: {
    ingested: number;
  };
}

interface NetworkEvent {
  source: {
    geo?: {
      country_name: string;
    };
  };
  destination: {
    geo?: {
      country_name: string;
    };
  };
}

const networkIndex = 'logs-endpoint.events.network-default';

export default function ({ getService }: FtrProviderContext) {
  const resolver = getService('resolverGenerator');
  const es = getService('es');
  const generator = new EndpointDocGenerator('data');

  const searchForID = async <T>(id: string) => {
    return es.search<SearchResponse<T>>({
      index: eventsIndexPattern,
      body: {
        query: {
          bool: {
            filter: [
              {
                ids: {
                  values: id,
                },
              },
            ],
          },
        },
      },
    });
  };

  describe('Endpoint package', () => {
    describe('ingested processor', () => {
      let event: Event;
      let genData: InsertedEvents;

      before(async () => {
        event = generator.generateEvent();
        genData = await resolver.insertEvents([event]);
      });

      after(async () => {
        await resolver.deleteData(genData);
      });

      it('sets the event.ingested field', async () => {
        const resp = await searchForID<EventIngested>(genData.eventsInfo[0]._id);
        expect(resp.body.hits.hits[0]._source.event.ingested).to.not.be(undefined);
      });
    });

    describe('geoip processor', () => {
      let processIndexData: InsertedEvents;
      let networkIndexData: InsertedEvents;

      before(async () => {
        // 46.239.193.5 should be in Iceland
        // 8.8.8.8 should be in the US
        const eventWithBothIPs = generator.generateEvent({
          extensions: { source: { ip: '8.8.8.8' }, destination: { ip: '46.239.193.5' } },
        });

        const eventWithSourceOnly = generator.generateEvent({
          extensions: { source: { ip: '8.8.8.8' } },
        });
        networkIndexData = await resolver.insertEvents(
          [eventWithBothIPs, eventWithSourceOnly],
          networkIndex
        );

        processIndexData = await resolver.insertEvents([eventWithBothIPs], processEventsIndex);
      });

      after(async () => {
        await resolver.deleteData(networkIndexData);
        await resolver.deleteData(processIndexData);
      });

      it('sets the geoip fields', async () => {
        const eventWithBothIPs = await searchForID<NetworkEvent>(
          networkIndexData.eventsInfo[0]._id
        );
        // Should be 'United States'
        expect(eventWithBothIPs.body.hits.hits[0]._source.source.geo?.country_name).to.not.be(
          undefined
        );
        // should be 'Iceland'
        expect(eventWithBothIPs.body.hits.hits[0]._source.destination.geo?.country_name).to.not.be(
          undefined
        );

        const eventWithSourceOnly = await searchForID<NetworkEvent>(
          networkIndexData.eventsInfo[1]._id
        );
        // Should be 'United States'
        expect(eventWithBothIPs.body.hits.hits[0]._source.source.geo?.country_name).to.not.be(
          undefined
        );
        expect(eventWithSourceOnly.body.hits.hits[0]._source.destination?.geo).to.be(undefined);
      });

      it('does not set geoip fields for events in indices other than the network index', async () => {
        const eventWithBothIPs = await searchForID<NetworkEvent>(
          processIndexData.eventsInfo[0]._id
        );
        expect(eventWithBothIPs.body.hits.hits[0]._source.source.geo).to.be(undefined);
        expect(eventWithBothIPs.body.hits.hits[0]._source.destination.geo).to.be(undefined);
      });
    });
  });
}
