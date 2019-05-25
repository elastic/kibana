/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ascending, pairs } from 'd3-array';
import gql from 'graphql-tag';
import { v4 as uuidv4 } from 'uuid';

import { sharedFragments } from '../../../../plugins/infra/common/graphql/shared';
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
          ...InfraTimeKeyFields
        }
        end {
          ...InfraTimeKeyFields
        }
        hasMoreBefore
        hasMoreAfter
        entries {
          ...InfraLogEntryFields
        }
      }
    }
  }

  ${sharedFragments.InfraTimeKey}
  ${sharedFragments.InfraLogEntryFields}
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
          ...InfraTimeKeyFields
        }
        end {
          ...InfraTimeKeyFields
        }
        hasMoreBefore
        hasMoreAfter
        entries {
          ...InfraLogEntryFields
        }
      }
    }
  }

  ${sharedFragments.InfraTimeKey}
  ${sharedFragments.InfraLogEntryFields}
`;

const logEntriesTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');
  const sourceConfigurationService = getService('infraOpsSourceConfiguration');

  describe('log entry apis', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));

    describe('logEntriesAround', () => {
      describe('with the default source', () => {
        before(() => esArchiver.load('empty_kibana'));
        after(() => esArchiver.unload('empty_kibana'));

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

        it('should return the default columns', async () => {
          const {
            data: {
              source: {
                logEntriesAround: {
                  entries: [entry],
                },
              },
            },
          } = await client.query<any>({
            query: logEntriesAroundQuery,
            variables: {
              timeKey: KEY_WITHIN_DATA_RANGE,
              countAfter: 1,
            },
          });

          expect(entry.columns).to.have.length(3);
          expect(entry.columns[0]).to.have.property('timestamp');
          expect(entry.columns[0].timestamp).to.be.a('number');
          expect(entry.columns[1]).to.have.property('field');
          expect(entry.columns[1].field).to.be('event.dataset');
          expect(entry.columns[1]).to.have.property('value');
          expect(JSON.parse)
            .withArgs(entry.columns[1].value)
            .to.not.throwException();
          expect(entry.columns[2]).to.have.property('message');
          expect(entry.columns[2].message).to.be.an('array');
          expect(entry.columns[2].message.length).to.be.greaterThan(0);
        });
      });

      describe('with a configured source', () => {
        before(async () => {
          await esArchiver.load('empty_kibana');
          await sourceConfigurationService.createConfiguration('default', {
            name: 'Test Source',
            logColumns: [
              {
                timestampColumn: {
                  id: uuidv4(),
                },
              },
              {
                fieldColumn: {
                  id: uuidv4(),
                  field: 'host.name',
                },
              },
              {
                fieldColumn: {
                  id: uuidv4(),
                  field: 'event.dataset',
                },
              },
              {
                messageColumn: {
                  id: uuidv4(),
                },
              },
            ],
          });
        });
        after(() => esArchiver.unload('empty_kibana'));

        it('should return the configured columns', async () => {
          const {
            data: {
              source: {
                logEntriesAround: {
                  entries: [entry],
                },
              },
            },
          } = await client.query<any>({
            query: logEntriesAroundQuery,
            variables: {
              timeKey: KEY_WITHIN_DATA_RANGE,
              countAfter: 1,
            },
          });

          expect(entry.columns).to.have.length(4);
          expect(entry.columns[0]).to.have.property('timestamp');
          expect(entry.columns[0].timestamp).to.be.a('number');
          expect(entry.columns[1]).to.have.property('field');
          expect(entry.columns[1].field).to.be('host.name');
          expect(entry.columns[1]).to.have.property('value');
          expect(JSON.parse)
            .withArgs(entry.columns[1].value)
            .to.not.throwException();
          expect(entry.columns[2]).to.have.property('field');
          expect(entry.columns[2].field).to.be('event.dataset');
          expect(entry.columns[2]).to.have.property('value');
          expect(JSON.parse)
            .withArgs(entry.columns[2].value)
            .to.not.throwException();
          expect(entry.columns[3]).to.have.property('message');
          expect(entry.columns[3].message).to.be.an('array');
          expect(entry.columns[3].message.length).to.be.greaterThan(0);
        });
      });
    });

    describe('logEntriesBetween', () => {
      describe('with the default source', () => {
        before(() => esArchiver.load('empty_kibana'));
        after(() => esArchiver.unload('empty_kibana'));

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
  });
};

// eslint-disable-next-line import/no-default-export
export default logEntriesTests;

const isSorted = <Value>(comparator: (first: Value, second: Value) => number) => (
  values: Value[]
) => pairs(values, comparator).every(order => order <= 0);

const ascendingTimeKey = (first: { key: InfraTimeKey }, second: { key: InfraTimeKey }) =>
  ascending(first.key.time, second.key.time) ||
  ascending(first.key.tiebreaker, second.key.tiebreaker);
