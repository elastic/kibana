/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { eventsQuery } from '../../../../plugins/siem/public/containers/events/index.gql_query';
import { LastEventTimeGqlQuery } from '../../../../plugins/siem/public/containers/events/last_event_time/last_event_time.gql_query';

import {
  Direction,
  GetEventsQuery,
  GetLastEventTimeQuery,
} from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

// typical values that have to change after an update from "scripts/es_archiver"
const HOST_NAME = 'suricata-sensor-amsterdam';
const TOTAL_COUNT = 1751;
const EDGE_LENGTH = 2;
const CURSOR_ID = '1550608953561';

const eventsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
  describe('events API', () => {
    describe('events', () => {
      before(() => esArchiver.load('auditbeat/hosts'));
      after(() => esArchiver.unload('auditbeat/hosts'));

      it('Make sure that we get Events data', () => {
        return client
          .query<GetEventsQuery.Query>({
            query: eventsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              pagination: {
                limit: 2,
                cursor: null,
                tiebreaker: null,
              },
              sortField: {
                sortFieldId: 'timestamp',
                direction: Direction.desc,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            },
          })
          .then(resp => {
            const events = resp.data.source.Events;
            expect(events.edges.length).to.be(EDGE_LENGTH);
            expect(events.totalCount).to.be(TOTAL_COUNT);
            expect(events.pageInfo.endCursor!.value).to.equal(CURSOR_ID);
          });
      });

      it('Make sure that pagination is working in Events query', () => {
        return client
          .query<GetEventsQuery.Query>({
            query: eventsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              pagination: {
                limit: 2,
                cursor: CURSOR_ID,
                tiebreaker: '193',
              },
              sortField: {
                sortFieldId: 'timestamp',
                direction: Direction.desc,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            },
          })
          .then(resp => {
            const events = resp.data.source.Events;

            expect(events.edges.length).to.be(EDGE_LENGTH);
            expect(events.totalCount).to.be(TOTAL_COUNT);
            expect(events.edges[0]!.node.host!.name).to.eql([HOST_NAME]);
          });
      });
      it('Make sure that timestamp is returned in the Events query', () => {
        return client
          .query<GetEventsQuery.Query>({
            query: eventsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              pagination: {
                limit: 2,
                cursor: CURSOR_ID,
                tiebreaker: '193',
              },
              sortField: {
                sortFieldId: 'timestamp',
                direction: Direction.desc,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            },
          })
          .then(resp => {
            const events = resp.data.source.Events;
            expect(events.edges[0]!.node.timestamp).to.eql('2019-02-19T20:42:29.965Z');
          });
      });
    });
    describe('last event time', () => {
      describe('packetbeat', () => {
        before(() => esArchiver.load('packetbeat/default'));
        after(() => esArchiver.unload('packetbeat/default'));
        it('Gets last event time - hosts', () => {
          return client
            .query<GetLastEventTimeQuery.Query>({
              query: LastEventTimeGqlQuery,
              variables: {
                sourceId: 'default',
                indexKey: 'hosts',
                details: {},
                defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              },
            })
            .then(resp => {
              const lastEventTime = resp.data.source.LastEventTime;
              expect(lastEventTime).to.eql({
                __typename: 'LastEventTimeData',
                lastSeen: '2019-04-26T21:45:14.012Z',
              });
            });
        });

        it('Gets last event time - network', () => {
          return client
            .query<GetLastEventTimeQuery.Query>({
              query: LastEventTimeGqlQuery,
              variables: {
                sourceId: 'default',
                indexKey: 'network',
                details: {},
                defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              },
            })
            .then(resp => {
              const lastEventTime = resp.data.source.LastEventTime;
              expect(lastEventTime).to.eql({
                __typename: 'LastEventTimeData',
                lastSeen: '2019-04-26T21:45:14.012Z',
              });
            });
        });
        it('Gets last event time - host details', () => {
          return client
            .query<GetLastEventTimeQuery.Query>({
              query: LastEventTimeGqlQuery,
              variables: {
                sourceId: 'default',
                indexKey: 'hostDetails',
                details: {
                  hostName: 'zeek-sensor-amsterdam',
                },
                defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              },
            })
            .then(resp => {
              const lastEventTime = resp.data.source.LastEventTime;
              expect(lastEventTime).to.eql({
                __typename: 'LastEventTimeData',
                lastSeen: '2019-02-19T23:26:46.720Z',
              });
            });
        });

        it('Gets last event time - ip overview', () => {
          return client
            .query<GetLastEventTimeQuery.Query>({
              query: LastEventTimeGqlQuery,
              variables: {
                sourceId: 'default',
                indexKey: 'ipDetails',
                details: { ip: '138.68.4.250' },
                defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              },
            })
            .then(resp => {
              const lastEventTime = resp.data.source.LastEventTime;
              expect(lastEventTime).to.eql({
                __typename: 'LastEventTimeData',
                lastSeen: '2019-02-19T23:26:50.000Z',
              });
            });
        });
      });
      describe('filebeat', () => {
        before(() => esArchiver.load('filebeat/default'));
        after(() => esArchiver.unload('filebeat/default'));
        it('Gets last event time - hosts', () => {
          return client
            .query<GetLastEventTimeQuery.Query>({
              query: LastEventTimeGqlQuery,
              variables: {
                sourceId: 'default',
                indexKey: 'hosts',
                details: {},
                defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              },
            })
            .then(resp => {
              const lastEventTime = resp.data.source.LastEventTime;
              expect(lastEventTime).to.eql({
                __typename: 'LastEventTimeData',
                lastSeen: '2019-04-26T21:45:14.012Z',
              });
            });
        });

        it('Gets last event time - network', () => {
          return client
            .query<GetLastEventTimeQuery.Query>({
              query: LastEventTimeGqlQuery,
              variables: {
                sourceId: 'default',
                indexKey: 'network',
                details: {},
                defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              },
            })
            .then(resp => {
              const lastEventTime = resp.data.source.LastEventTime;
              expect(lastEventTime).to.eql({
                __typename: 'LastEventTimeData',
                lastSeen: '2019-04-26T21:45:14.012Z',
              });
            });
        });
        it('Gets last event time - host details', () => {
          return client
            .query<GetLastEventTimeQuery.Query>({
              query: LastEventTimeGqlQuery,
              variables: {
                sourceId: 'default',
                indexKey: 'hostDetails',
                details: {
                  hostName: 'raspberrypi',
                },
                defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              },
            })
            .then(resp => {
              const lastEventTime = resp.data.source.LastEventTime;
              expect(lastEventTime).to.eql({
                __typename: 'LastEventTimeData',
                lastSeen: '2019-02-10T03:00:13.001Z',
              });
            });
        });

        it('Gets last event time - ip overview', () => {
          return client
            .query<GetLastEventTimeQuery.Query>({
              query: LastEventTimeGqlQuery,
              variables: {
                sourceId: 'default',
                indexKey: 'ipDetails',
                details: { ip: '54.239.219.228' },
                defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              },
            })
            .then(resp => {
              const lastEventTime = resp.data.source.LastEventTime;
              expect(lastEventTime).to.eql({
                __typename: 'LastEventTimeData',
                lastSeen: '2019-02-09T16:45:34.135Z',
              });
            });
        });
      });
      describe('auditbeat (hosts only)', () => {
        before(() => esArchiver.load('auditbeat/default'));
        after(() => esArchiver.unload('auditbeat/default'));
        it('Gets last event time - hosts', () => {
          return client
            .query<GetLastEventTimeQuery.Query>({
              query: LastEventTimeGqlQuery,
              variables: {
                sourceId: 'default',
                indexKey: 'hosts',
                details: {},
                defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              },
            })
            .then(resp => {
              const lastEventTime = resp.data.source.LastEventTime;
              expect(lastEventTime).to.eql({
                __typename: 'LastEventTimeData',
                lastSeen: '2019-04-26T21:45:14.012Z',
              });
            });
        });
        it('Gets last event time - host details', () => {
          return client
            .query<GetLastEventTimeQuery.Query>({
              query: LastEventTimeGqlQuery,
              variables: {
                sourceId: 'default',
                indexKey: 'hostDetails',
                details: {
                  hostName: 'demo-stack-nginx-01',
                },
                defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              },
            })
            .then(resp => {
              const lastEventTime = resp.data.source.LastEventTime;
              expect(lastEventTime).to.eql({
                __typename: 'LastEventTimeData',
                lastSeen: '2018-11-27T02:59:00.461Z',
              });
            });
        });
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default eventsTests;
