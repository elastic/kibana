/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ResolverPaginatedEvents,
  SafeEndpointEvent,
} from '@kbn/security-solution-plugin/common/endpoint/types';
import { eventsIndexPattern } from '@kbn/security-solution-plugin/common/endpoint/constants';
import {
  EndpointDocGenerator,
  Event,
} from '@kbn/security-solution-plugin/common/endpoint/generate_data';
import { FtrProviderContext } from '../ftr_provider_context';
import { InsertedEvents, processEventsIndex } from '../services/resolver';
import { deleteEventsStream } from './data_stream_helper';

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
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const resolver = getService('resolverGenerator');
  const es = getService('es');
  const generator = new EndpointDocGenerator('data');

  const searchForID = async <T>(id: string) => {
    return es.search<T>(
      {
        index: eventsIndexPattern,
        body: {
          query: {
            bool: {
              filter: [
                {
                  ids: {
                    values: [id],
                  },
                },
              ],
            },
          },
        },
      },
      { meta: true }
    );
  };

  // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/114885
  describe.skip('Endpoint package', () => {
    describe('network processors', () => {
      let networkIndexData: InsertedEvents;

      after(async () => {
        await resolver.deleteData(networkIndexData);
      });

      it('handles events without the `network.protocol` field being defined', async () => {
        const eventWithoutNetworkObject = generator.generateEvent({
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(networkIndex),
        });
        // ensure that `network.protocol` does not exist in the event to test that the pipeline handles those type of events
        delete eventWithoutNetworkObject.network;

        // this call will fail if the pipeline fails
        networkIndexData = await resolver.insertEvents([eventWithoutNetworkObject], networkIndex);
        const eventWithBothIPs = await searchForID<SafeEndpointEvent>(
          networkIndexData.eventsInfo[0]._id
        );

        // ensure that the event was inserted into ES
        expect(eventWithBothIPs.body.hits.hits[0]._source?.event?.id).to.be(
          eventWithoutNetworkObject.event?.id
        );
      });
    });

    describe('dns processor', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/endpoint/pipeline/dns', {
          useCreate: true,
        });
      });

      after(async () => {
        await deleteEventsStream(getService);
      });

      it('does not set dns.question.type if it is already populated', async () => {
        // this id comes from the es archive file endpoint/pipeline/dns
        const id = 'LrLSOVHVsFY94TAi++++++eF';
        const { body }: { body: ResolverPaginatedEvents } = await supertest
          .post(`/api/endpoint/resolver/events`)
          .query({ limit: 1 })
          .set('kbn-xsrf', 'xxx')
          .send({
            filter: JSON.stringify({
              bool: {
                filter: [{ term: { 'event.id': id } }],
              },
            }),
            indexPatterns: [eventsIndexPattern],
            // these times are taken from the es archiver data endpoint/pipeline/dns for this specific event
            timeRange: {
              from: '2020-10-01T13:50:15.14364600Z',
              to: '2020-10-01T13:50:15.14364600Z',
            },
          })
          .expect(200);
        expect(body.events.length).to.eql(1);
        expect((body.events[0] as SafeEndpointEvent).dns?.question?.name).to.eql('www.google.com');
        expect((body.events[0] as SafeEndpointEvent).dns?.question?.type).to.eql('INVALID_VALUE');
      });

      it('sets dns.question.type if it is not populated', async () => {
        // this id comes from the es archive file endpoint/pipeline/dns
        const id = 'LrLSOVHVsFY94TAi++++++eP';
        const { body }: { body: ResolverPaginatedEvents } = await supertest
          .post(`/api/endpoint/resolver/events`)
          .query({ limit: 1 })
          .set('kbn-xsrf', 'xxx')
          .send({
            filter: JSON.stringify({
              bool: {
                filter: [{ term: { 'event.id': id } }],
              },
            }),
            indexPatterns: [eventsIndexPattern],
            // these times are taken from the es archiver data endpoint/pipeline/dns for this specific event
            timeRange: {
              from: '2020-10-01T13:50:15.44516300Z',
              to: '2020-10-01T13:50:15.44516300Z',
            },
          })
          .expect(200);
        expect(body.events.length).to.eql(1);
        expect((body.events[0] as SafeEndpointEvent).dns?.question?.name).to.eql('www.aol.com');
        // This value is parsed out of the message field in the event. type 28 = AAAA
        expect((body.events[0] as SafeEndpointEvent).dns?.question?.type).to.eql('AAAA');
      });
    });

    describe('ingested processor', () => {
      let event: Event;
      let genData: InsertedEvents;

      before(async () => {
        event = generator.generateEvent({
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        genData = await resolver.insertEvents([event], processEventsIndex);
      });

      after(async () => {
        await resolver.deleteData(genData);
      });

      it('sets the event.ingested field', async () => {
        const resp = await searchForID<EventIngested>(genData.eventsInfo[0]._id);
        expect(resp.body.hits.hits[0]._source?.event.ingested).to.not.be(undefined);
      });
    });

    describe('geoip processor', () => {
      let processIndexData: InsertedEvents;
      let networkIndexData: InsertedEvents;

      before(async () => {
        // 46.239.193.5 should be in Iceland
        // 8.8.8.8 should be in the US
        const eventWithBothIPsNetwork = generator.generateEvent({
          extensions: { source: { ip: '8.8.8.8' }, destination: { ip: '46.239.193.5' } },
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(networkIndex),
        });

        const eventWithSourceOnlyNetwork = generator.generateEvent({
          extensions: { source: { ip: '8.8.8.8' } },
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(networkIndex),
        });

        networkIndexData = await resolver.insertEvents(
          [eventWithBothIPsNetwork, eventWithSourceOnlyNetwork],
          networkIndex
        );

        const eventWithBothIPsProcess = generator.generateEvent({
          extensions: { source: { ip: '8.8.8.8' }, destination: { ip: '46.239.193.5' } },
          eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(processEventsIndex),
        });
        processIndexData = await resolver.insertEvents(
          [eventWithBothIPsProcess],
          processEventsIndex
        );
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
        expect(eventWithBothIPs.body.hits.hits[0]._source?.source.geo?.country_name).to.not.be(
          undefined
        );
        // should be 'Iceland'
        expect(eventWithBothIPs.body.hits.hits[0]._source?.destination.geo?.country_name).to.not.be(
          undefined
        );

        const eventWithSourceOnly = await searchForID<NetworkEvent>(
          networkIndexData.eventsInfo[1]._id
        );
        // Should be 'United States'
        expect(eventWithBothIPs.body.hits.hits[0]._source?.source.geo?.country_name).to.not.be(
          undefined
        );
        expect(eventWithSourceOnly.body.hits.hits[0]._source?.destination?.geo).to.be(undefined);
      });

      it('does not set geoip fields for events in indices other than the network index', async () => {
        const eventWithBothIPs = await searchForID<NetworkEvent>(
          processIndexData.eventsInfo[0]._id
        );
        expect(eventWithBothIPs.body.hits.hits[0]._source?.source.geo).to.be(undefined);
        expect(eventWithBothIPs.body.hits.hits[0]._source?.destination.geo).to.be(undefined);
      });
    });
  });
}
