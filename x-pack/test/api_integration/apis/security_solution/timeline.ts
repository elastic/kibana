/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { Direction } from '../../../../plugins/security_solution/common/search_strategy';
// @ts-expect-error
import { timelineQuery } from '../../../../plugins/security_solution/public/timelines/containers/index.gql_query';
// @ts-expect-error
import { GetTimelineQuery } from '../../../../plugins/security_solution/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

const TO = '3000-01-01T00:00:00.000Z';
const FROM = '2000-01-01T00:00:00.000Z';

// typical values that have to change after an update from "scripts/es_archiver"
const DATA_COUNT = 2;
const HOST_NAME = 'suricata-sensor-amsterdam';
const TOTAL_COUNT = 96;
const EDGE_LENGTH = 2;
const CURSOR_ID = '1550608949681';

const FILTER_VALUE = {
  bool: {
    filter: [
      {
        bool: {
          should: [{ match_phrase: { 'host.name': HOST_NAME } }],
          minimum_should_match: 1,
        },
      },
      {
        bool: {
          filter: [
            {
              bool: {
                should: [{ range: { '@timestamp': { gte: FROM } } }],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [{ range: { '@timestamp': { lte: TO } } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    ],
  },
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('securitySolutionGraphQLClient');

  describe('Timeline', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('Make sure that we get Timeline data', () => {
      return client
        .query<GetTimelineQuery.Query>({
          query: timelineQuery,
          variables: {
            sourceId: 'default',
            filterQuery: JSON.stringify(FILTER_VALUE),
            pagination: {
              limit: 2,
              cursor: null,
              tiebreaker: null,
            },
            sortField: {
              sortFieldId: 'timestamp',
              direction: Direction.desc,
            },
            fieldRequested: ['@timestamp', 'host.name'],
            defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            docValueFields: [],
            inspect: false,
            timerange: {
              from: FROM,
              to: TO,
              interval: '12h',
            },
          },
        })
        .then((resp) => {
          const timeline = resp.data.source.Timeline;
          expect(timeline.edges.length).to.be(EDGE_LENGTH);
          expect(timeline.edges[0].node.data.length).to.be(DATA_COUNT);
          expect(timeline.totalCount).to.be(TOTAL_COUNT);
          expect(timeline.pageInfo.endCursor!.value).to.equal(CURSOR_ID);
        });
    });

    it('Make sure that pagination is working in Timeline query', () => {
      return client
        .query<GetTimelineQuery.Query>({
          query: timelineQuery,
          variables: {
            sourceId: 'default',
            filterQuery: JSON.stringify(FILTER_VALUE),
            pagination: {
              limit: 2,
              cursor: CURSOR_ID,
              tiebreaker: '191',
            },
            sortField: {
              sortFieldId: 'timestamp',
              direction: Direction.desc,
            },
            fieldRequested: ['@timestamp', 'host.name'],
            defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            docValueFields: [],
            inspect: false,
            timerange: {
              from: FROM,
              to: TO,
              interval: '12h',
            },
          },
        })
        .then((resp) => {
          const timeline = resp.data.source.Timeline;
          expect(timeline.edges.length).to.be(EDGE_LENGTH);
          expect(timeline.totalCount).to.be(TOTAL_COUNT);
          expect(timeline.edges[0].node.data.length).to.be(DATA_COUNT);
          expect(timeline.edges[0]!.node.ecs.host!.name).to.eql([HOST_NAME]);
        });
    });
  });
}
