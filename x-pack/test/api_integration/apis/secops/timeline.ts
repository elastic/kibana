/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { timelineQuery } from '../../../../plugins/secops/public/containers/timeline/index.gql_query';
import { GetTimelineQuery } from '../../../../plugins/secops/public/graphql/types';

import { KbnTestProvider } from './types';

const timelineTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('secOpsGraphQLClient');

  describe('events', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('Make sure that we get Timeline data', () => {
      return client
        .query<GetTimelineQuery.Query>({
          query: timelineQuery,
          variables: {
            sourceId: 'default',
            filterQuery:
              '{"bool":{"filter":[{"bool":{"should":[{"match_phrase":{"host.name":"siem-kibana"}}],"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1483306065535}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1546554465535}}}],"minimum_should_match":1}}]}}]}}',
            pagination: {
              limit: 2,
              cursor: null,
              tiebreaker: null,
            },
            sortField: {
              sortFieldId: 'timestamp',
              direction: 'descending',
            },
          },
        })
        .then(resp => {
          const events = resp.data.source.Events;
          expect(events.edges.length).to.be(2);
          expect(events.totalCount).to.be(494);
          expect(events.pageInfo.endCursor!.value).to.equal('1546483081822');
        });
    });

    it('Make sure that pagination is working in Timeline query', () => {
      return client
        .query<GetTimelineQuery.Query>({
          query: timelineQuery,
          variables: {
            sourceId: 'default',
            filterQuery:
              '{"bool":{"filter":[{"bool":{"should":[{"match_phrase":{"host.name":"siem-kibana"}}],"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1483306065535}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1546554465535}}}],"minimum_should_match":1}}]}}]}}',
            pagination: {
              limit: 2,
              cursor: '1546483081822',
              tiebreaker: '191',
            },
            sortField: {
              sortFieldId: 'timestamp',
              direction: 'descending',
            },
          },
        })
        .then(resp => {
          const events = resp.data.source.Events;

          expect(events.edges.length).to.be(2);
          expect(events.totalCount).to.be(494);
          expect(events.edges[0]!.node.host!.name).to.be('siem-kibana');
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default timelineTests;
