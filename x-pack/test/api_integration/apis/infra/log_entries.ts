/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ascending, pairs } from 'd3-array';
import expect from 'expect.js';
import gql from 'graphql-tag';

import { InfraTimeKey } from '../../../../plugins/infra/public/graphql/types';
import { KbnTestProvider } from './types';

const KEY_WITHIN_DATA_RANGE = {
  time: new Date('2018-10-17T19:50:00.000Z').valueOf(),
  tiebreaker: 0,
};
const EARLIEST_KEY_WITH_DATA = {
  time: new Date('2018-10-17T19:42:22.000Z').valueOf(),
  tiebreaker: 5497614,
};
const LATEST_KEY_WITH_DATA = {
  time: new Date('2018-10-17T19:57:21.611Z').valueOf(),
  tiebreaker: 5603910,
};

const logEntriesAroundQuery = gql`
  query LogEntriesAroundQuery(
    $timeKey: InfraTimeKeyInput!
    $countBefore: Int = 0
    $countAfter: Int = 0
    $filterQuery: String
  ) {
    source(id: "default") {
      id
      logEntriesAround(
        key: $timeKey
        countBefore: $countBefore
        countAfter: $countAfter
        filterQuery: $filterQuery
      ) {
        start {
          time
          tiebreaker
        }
        end {
          time
          tiebreaker
        }
        hasMoreBefore
        hasMoreAfter
        entries {
          gid
          key {
            time
            tiebreaker
          }
          message {
            ... on InfraLogMessageFieldSegment {
              field
              value
            }
            ... on InfraLogMessageConstantSegment {
              constant
            }
          }
        }
      }
    }
  }
`;

const logEntriesBetweenQuery = gql`
  query LogEntriesBetweenQuery(
    $startKey: InfraTimeKeyInput!
    $endKey: InfraTimeKeyInput!
    $filterQuery: String
  ) {
    source(id: "default") {
      id
      logEntriesBetween(startKey: $startKey, endKey: $endKey, filterQuery: $filterQuery) {
        start {
          time
          tiebreaker
        }
        end {
          time
          tiebreaker
        }
        hasMoreBefore
        hasMoreAfter
        entries {
          gid
          key {
            time
            tiebreaker
          }
          message {
            ... on InfraLogMessageFieldSegment {
              field
              value
            }
            ... on InfraLogMessageConstantSegment {
              constant
            }
          }
        }
      }
    }
  }
`;

const logEntriesTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('log entry apis', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));

    describe('logEntriesAround', () => {
      it('should return newer and older log entries when present', async () => {
        const {
          data: {
            source: { logEntriesAround },
          },
        } = await client.query<any>({
          query: logEntriesAroundQuery,
          variables: {
            timeKey: KEY_WITHIN_DATA_RANGE,
            countBefore: 100,
            countAfter: 100,
          },
        });

        expect(logEntriesAround).to.have.property('entries');
        expect(logEntriesAround.entries).to.have.length(200);
        expect(isSorted(ascendingTimeKey)(logEntriesAround.entries)).to.equal(true);

        expect(logEntriesAround.hasMoreBefore).to.equal(true);
        expect(logEntriesAround.hasMoreAfter).to.equal(true);
      });

      it('should indicate if no older entries are present', async () => {
        const {
          data: {
            source: { logEntriesAround },
          },
        } = await client.query<any>({
          query: logEntriesAroundQuery,
          variables: {
            timeKey: EARLIEST_KEY_WITH_DATA,
            countBefore: 100,
            countAfter: 100,
          },
        });

        expect(logEntriesAround.hasMoreBefore).to.equal(false);
        expect(logEntriesAround.hasMoreAfter).to.equal(true);
      });

      it('should indicate if no newer entries are present', async () => {
        const {
          data: {
            source: { logEntriesAround },
          },
        } = await client.query<any>({
          query: logEntriesAroundQuery,
          variables: {
            timeKey: LATEST_KEY_WITH_DATA,
            countBefore: 100,
            countAfter: 100,
          },
        });

        expect(logEntriesAround.hasMoreBefore).to.equal(true);
        expect(logEntriesAround.hasMoreAfter).to.equal(false);
      });
    });

    describe('logEntriesBetween', () => {
      it('should return log entries between the start and end keys', async () => {
        const {
          data: {
            source: { logEntriesBetween },
          },
        } = await client.query<any>({
          query: logEntriesBetweenQuery,
          variables: {
            startKey: EARLIEST_KEY_WITH_DATA,
            endKey: KEY_WITHIN_DATA_RANGE,
          },
        });

        expect(logEntriesBetween).to.have.property('entries');
        expect(logEntriesBetween.entries).to.not.be.empty();
        expect(isSorted(ascendingTimeKey)(logEntriesBetween.entries)).to.equal(true);

        expect(
          ascendingTimeKey(logEntriesBetween.entries[0], { key: EARLIEST_KEY_WITH_DATA })
        ).to.be.above(-1);
        expect(
          ascendingTimeKey(logEntriesBetween.entries[logEntriesBetween.entries.length - 1], {
            key: KEY_WITHIN_DATA_RANGE,
          })
        ).to.be.below(1);
      });

      it('should return results consistent with logEntriesAround', async () => {
        const {
          data: {
            source: { logEntriesAround },
          },
        } = await client.query<any>({
          query: logEntriesAroundQuery,
          variables: {
            timeKey: KEY_WITHIN_DATA_RANGE,
            countBefore: 100,
            countAfter: 100,
          },
        });

        const {
          data: {
            source: { logEntriesBetween },
          },
        } = await client.query<any>({
          query: logEntriesBetweenQuery,
          variables: {
            startKey: {
              time: logEntriesAround.start.time,
              tiebreaker: logEntriesAround.start.tiebreaker - 1,
            },
            endKey: {
              time: logEntriesAround.end.time,
              tiebreaker: logEntriesAround.end.tiebreaker + 1,
            },
          },
        });

        expect(logEntriesBetween).to.eql(logEntriesAround);
      });
    });
  });
};

// tslint:disable-next-line no-default-export
export default logEntriesTests;

const isSorted = <Value>(comparator: (first: Value, second: Value) => number) => (
  values: Value[]
) => pairs(values, comparator).every(order => order <= 0);

const ascendingTimeKey = (first: { key: InfraTimeKey }, second: { key: InfraTimeKey }) =>
  ascending(first.key.time, second.key.time) ||
  ascending(first.key.tiebreaker, second.key.tiebreaker);
