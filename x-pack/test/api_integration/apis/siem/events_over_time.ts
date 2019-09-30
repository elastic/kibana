/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { EventsOverTimeGqlQuery } from '../../../../legacy/plugins/siem/public/containers/events/events_over_time/events_over_time.gql_query';
import { GetEventsOverTimeQuery } from '../../../../legacy/plugins/siem/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
  const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
  const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();
  describe('Events over time', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

      it('Make sure that we get events over time data', () => {
        return client
          .query<GetEventsOverTimeQuery.Query>({
            query: EventsOverTimeGqlQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
            },
          })
          .then(resp => {
            const expectedData = [
              {
                x: new Date('2018-12-20T00:00:00.000Z').valueOf(),
                y: 4884,
                g: 'All others',
                __typename: 'MatrixOverTimeHistogramData',
              },
              {
                x: new Date('2018-12-20T00:00:00.000Z').valueOf(),
                y: 1273,
                g: 'netflow_flow',
                __typename: 'MatrixOverTimeHistogramData',
              },
            ];
            const eventsOverTime = resp.data.source.EventsOverTime;
            expect(eventsOverTime.eventsOverTime).to.eql(expectedData);
          });
      });
    });

    describe('With packetbeat', () => {
      before(() => esArchiver.load('packetbeat/default'));
      after(() => esArchiver.unload('packetbeat/default'));

      it('Make sure that we get events over time data', () => {
        return client
          .query<GetEventsOverTimeQuery.Query>({
            query: EventsOverTimeGqlQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
            },
          })
          .then(resp => {
            const expectedData = [
              {
                x: new Date('2018-12-20T00:00:00.000Z').valueOf(),
                y: 4884,
                g: 'All others',
                __typename: 'MatrixOverTimeHistogramData',
              },
              {
                x: new Date('2018-12-20T00:00:00.000Z').valueOf(),
                y: 1273,
                g: 'netflow_flow',
                __typename: 'MatrixOverTimeHistogramData',
              },
            ];
            const eventsOverTime = resp.data.source.EventsOverTime;
            expect(eventsOverTime.eventsOverTime).to.eql(expectedData);
          });
      });
    });
  });
}
