/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ascending, pairs } from 'd3-array';
import gql from 'graphql-tag';

import { FtrProviderContext } from '../../ftr_provider_context';
import { sharedFragments } from '../../../../legacy/plugins/infra/common/graphql/shared';
import { InfraTimeKey } from '../../../../legacy/plugins/infra/public/graphql/types';

const KEY_BEFORE_START = {
  time: new Date('2000-01-01T00:00:00.000Z').valueOf(),
  tiebreaker: -1,
};
const KEY_AFTER_START = {
  time: new Date('2000-01-01T00:00:04.000Z').valueOf(),
  tiebreaker: -1,
};
const KEY_BEFORE_END = {
  time: new Date('2000-01-01T00:00:06.001Z').valueOf(),
  tiebreaker: 0,
};
const KEY_AFTER_END = {
  time: new Date('2000-01-01T00:00:09.001Z').valueOf(),
  tiebreaker: 0,
};

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('log highlight apis', () => {
    before(() => esArchiver.load('infra/simple_logs'));
    after(() => esArchiver.unload('infra/simple_logs'));

    describe('logEntryHighlights', () => {
      describe('with the default source', () => {
        before(() => esArchiver.load('empty_kibana'));
        after(() => esArchiver.unload('empty_kibana'));

        it('should return log highlights in the built-in message column', async () => {
          const {
            data: {
              source: { logEntryHighlights },
            },
          } = await client.query<any>({
            query: logEntryHighlightsQuery,
            variables: {
              sourceId: 'default',
              startKey: KEY_BEFORE_START,
              endKey: KEY_AFTER_END,
              highlights: [
                {
                  query: 'message of document 0',
                  countBefore: 0,
                  countAfter: 0,
                },
              ],
            },
          });

          expect(logEntryHighlights).to.have.length(1);

          const [logEntryHighlightSet] = logEntryHighlights;
          expect(logEntryHighlightSet).to.have.property('entries');
          // ten bundles with one highlight each
          expect(logEntryHighlightSet.entries).to.have.length(10);
          expect(isSorted(ascendingTimeKey)(logEntryHighlightSet.entries)).to.equal(true);

          for (const logEntryHighlight of logEntryHighlightSet.entries) {
            expect(logEntryHighlight.columns).to.have.length(3);
            expect(logEntryHighlight.columns[1]).to.have.property('field');
            expect(logEntryHighlight.columns[1]).to.have.property('highlights');
            expect(logEntryHighlight.columns[1].highlights).to.eql([]);
            expect(logEntryHighlight.columns[2]).to.have.property('message');
            expect(logEntryHighlight.columns[2].message).to.be.an('array');
            expect(logEntryHighlight.columns[2].message.length).to.be(1);
            expect(logEntryHighlight.columns[2].message[0].highlights).to.eql([
              'message',
              'of',
              'document',
              '0',
            ]);
          }
        });

        // https://github.com/elastic/kibana/issues/49959
        it.skip('should return log highlights in a field column', async () => {
          const {
            data: {
              source: { logEntryHighlights },
            },
          } = await client.query<any>({
            query: logEntryHighlightsQuery,
            variables: {
              sourceId: 'default',
              startKey: KEY_BEFORE_START,
              endKey: KEY_AFTER_END,
              highlights: [
                {
                  query: 'generate_test_data/simple_logs',
                  countBefore: 0,
                  countAfter: 0,
                },
              ],
            },
          });

          expect(logEntryHighlights).to.have.length(1);

          const [logEntryHighlightSet] = logEntryHighlights;
          expect(logEntryHighlightSet).to.have.property('entries');
          // ten bundles with five highlights each
          expect(logEntryHighlightSet.entries).to.have.length(50);
          expect(isSorted(ascendingTimeKey)(logEntryHighlightSet.entries)).to.equal(true);

          for (const logEntryHighlight of logEntryHighlightSet.entries) {
            expect(logEntryHighlight.columns).to.have.length(3);
            expect(logEntryHighlight.columns[1]).to.have.property('field');
            expect(logEntryHighlight.columns[1]).to.have.property('highlights');
            expect(logEntryHighlight.columns[1].highlights).to.eql([
              'generate_test_data/simple_logs',
            ]);
            expect(logEntryHighlight.columns[2]).to.have.property('message');
            expect(logEntryHighlight.columns[2].message).to.be.an('array');
            expect(logEntryHighlight.columns[2].message.length).to.be(1);
            expect(logEntryHighlight.columns[2].message[0].highlights).to.eql([]);
          }
        });

        it('should apply the filter query in addition to the highlight query', async () => {
          const {
            data: {
              source: { logEntryHighlights },
            },
          } = await client.query<any>({
            query: logEntryHighlightsQuery,
            variables: {
              sourceId: 'default',
              startKey: KEY_BEFORE_START,
              endKey: KEY_AFTER_END,
              filterQuery: JSON.stringify({
                multi_match: { query: 'host-a', type: 'phrase', lenient: true },
              }),
              highlights: [
                {
                  query: 'message',
                  countBefore: 0,
                  countAfter: 0,
                },
              ],
            },
          });

          expect(logEntryHighlights).to.have.length(1);

          const [logEntryHighlightSet] = logEntryHighlights;
          expect(logEntryHighlightSet).to.have.property('entries');
          // half of the documenst
          expect(logEntryHighlightSet.entries).to.have.length(25);
          expect(isSorted(ascendingTimeKey)(logEntryHighlightSet.entries)).to.equal(true);

          for (const logEntryHighlight of logEntryHighlightSet.entries) {
            expect(logEntryHighlight.columns).to.have.length(3);
            expect(logEntryHighlight.columns[1]).to.have.property('field');
            expect(logEntryHighlight.columns[1]).to.have.property('highlights');
            expect(logEntryHighlight.columns[1].highlights).to.eql([]);
            expect(logEntryHighlight.columns[2]).to.have.property('message');
            expect(logEntryHighlight.columns[2].message).to.be.an('array');
            expect(logEntryHighlight.columns[2].message.length).to.be(1);
            expect(logEntryHighlight.columns[2].message[0].highlights).to.eql([
              'message',
              'message',
            ]);
          }
        });

        it('should return highlights outside of the interval when requested', async () => {
          const {
            data: {
              source: { logEntryHighlights },
            },
          } = await client.query<any>({
            query: logEntryHighlightsQuery,
            variables: {
              sourceId: 'default',
              startKey: KEY_AFTER_START,
              endKey: KEY_BEFORE_END,
              highlights: [
                {
                  query: 'message of document 0',
                  countBefore: 2,
                  countAfter: 2,
                },
              ],
            },
          });

          expect(logEntryHighlights).to.have.length(1);

          const [logEntryHighlightSet] = logEntryHighlights;
          expect(logEntryHighlightSet).to.have.property('entries');
          // three bundles with one highlight each plus two beyond each interval boundary
          expect(logEntryHighlightSet.entries).to.have.length(3 + 4);
          expect(isSorted(ascendingTimeKey)(logEntryHighlightSet.entries)).to.equal(true);

          for (const logEntryHighlight of logEntryHighlightSet.entries) {
            expect(logEntryHighlight.columns).to.have.length(3);
            expect(logEntryHighlight.columns[1]).to.have.property('field');
            expect(logEntryHighlight.columns[1]).to.have.property('highlights');
            expect(logEntryHighlight.columns[1].highlights).to.eql([]);
            expect(logEntryHighlight.columns[2]).to.have.property('message');
            expect(logEntryHighlight.columns[2].message).to.be.an('array');
            expect(logEntryHighlight.columns[2].message.length).to.be(1);
            expect(logEntryHighlight.columns[2].message[0].highlights).to.eql([
              'message',
              'of',
              'document',
              '0',
            ]);
          }
        });
      });
    });
  });
}

const logEntryHighlightsQuery = gql`
  query LogEntryHighlightsQuery(
    $sourceId: ID = "default"
    $startKey: InfraTimeKeyInput!
    $endKey: InfraTimeKeyInput!
    $filterQuery: String
    $highlights: [InfraLogEntryHighlightInput!]!
  ) {
    source(id: $sourceId) {
      id
      logEntryHighlights(
        startKey: $startKey
        endKey: $endKey
        filterQuery: $filterQuery
        highlights: $highlights
      ) {
        start {
          ...InfraTimeKeyFields
        }
        end {
          ...InfraTimeKeyFields
        }
        entries {
          ...InfraLogEntryHighlightFields
        }
      }
    }
  }

  ${sharedFragments.InfraTimeKey}
  ${sharedFragments.InfraLogEntryHighlightFields}
`;

const isSorted = <Value>(comparator: (first: Value, second: Value) => number) => (
  values: Value[]
) => pairs(values, comparator).every(order => order <= 0);

const ascendingTimeKey = (first: { key: InfraTimeKey }, second: { key: InfraTimeKey }) =>
  ascending(first.key.time, second.key.time) ||
  ascending(first.key.tiebreaker, second.key.tiebreaker);
