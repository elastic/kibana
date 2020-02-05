/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ascending, pairs } from 'd3-array';
import gql from 'graphql-tag';
import { v4 as uuidv4 } from 'uuid';

import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { fold } from 'fp-ts/lib/Either';

import {
  createPlainError,
  throwErrors,
} from '../../../../legacy/plugins/infra/common/runtime_types';

import {
  LOG_ENTRIES_PATH,
  logEntriesRequestRT,
  logEntriesResponseRT,
} from '../../../../legacy/plugins/infra/common/http_api';

import { sharedFragments } from '../../../../legacy/plugins/infra/common/graphql/shared';
import { InfraTimeKey } from '../../../../legacy/plugins/infra/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

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

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');
  const supertest = getService('supertest');
  const sourceConfigurationService = getService('infraOpsSourceConfiguration');

  describe('log entry apis', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));

    describe('/log_entries/entries', () => {
      describe('with the default source', () => {
        before(() => esArchiver.load('empty_kibana'));
        after(() => esArchiver.unload('empty_kibana'));

        it('works', async () => {
          const { body } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startDate: EARLIEST_KEY_WITH_DATA.time,
                endDate: KEY_WITHIN_DATA_RANGE.time,
              })
            )
            .expect(200);

          const logEntriesResponse = pipe(
            logEntriesResponseRT.decode(body),
            fold(throwErrors(createPlainError), identity)
          );

          const entries = logEntriesResponse.data.entries;
          const firstEntry = entries[0];
          const lastEntry = entries[entries.length - 1];

          // Has the default page size
          expect(entries).to.have.length(200);

          // Cursors are set correctly
          expect(firstEntry.cursor).to.eql(logEntriesResponse.data.topCursor);
          expect(lastEntry.cursor).to.eql(logEntriesResponse.data.bottomCursor);

          // Entries fall within range
          // @kbn/expect doesn't have a `lessOrEqualThan` or `moreOrEqualThan` comparators
          expect(firstEntry.cursor.time >= EARLIEST_KEY_WITH_DATA.time).to.be(true);
          expect(lastEntry.cursor.time <= KEY_WITHIN_DATA_RANGE.time).to.be(true);
        });

        it('Paginates correctly with `after`', async () => {
          const { body: firstPageBody } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startDate: EARLIEST_KEY_WITH_DATA.time,
                endDate: KEY_WITHIN_DATA_RANGE.time,
                size: 10,
              })
            );
          const firstPage = pipe(
            logEntriesResponseRT.decode(firstPageBody),
            fold(throwErrors(createPlainError), identity)
          );

          const { body: secondPageBody } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startDate: EARLIEST_KEY_WITH_DATA.time,
                endDate: KEY_WITHIN_DATA_RANGE.time,
                after: firstPage.data.bottomCursor,
                size: 10,
              })
            );
          const secondPage = pipe(
            logEntriesResponseRT.decode(secondPageBody),
            fold(throwErrors(createPlainError), identity)
          );

          const { body: bothPagesBody } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startDate: EARLIEST_KEY_WITH_DATA.time,
                endDate: KEY_WITHIN_DATA_RANGE.time,
                size: 20,
              })
            );
          const bothPages = pipe(
            logEntriesResponseRT.decode(bothPagesBody),
            fold(throwErrors(createPlainError), identity)
          );

          expect(bothPages.data.entries).to.eql([
            ...firstPage.data.entries,
            ...secondPage.data.entries,
          ]);

          expect(bothPages.data.topCursor).to.eql(firstPage.data.topCursor);
          expect(bothPages.data.bottomCursor).to.eql(secondPage.data.bottomCursor);
        });

        it('Paginates correctly with `before`', async () => {
          const { body: lastPageBody } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startDate: KEY_WITHIN_DATA_RANGE.time,
                endDate: LATEST_KEY_WITH_DATA.time,
                before: 'last',
                size: 10,
              })
            );
          const lastPage = pipe(
            logEntriesResponseRT.decode(lastPageBody),
            fold(throwErrors(createPlainError), identity)
          );

          const { body: secondToLastPageBody } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startDate: KEY_WITHIN_DATA_RANGE.time,
                endDate: LATEST_KEY_WITH_DATA.time,
                before: lastPage.data.topCursor,
                size: 10,
              })
            );
          const secondToLastPage = pipe(
            logEntriesResponseRT.decode(secondToLastPageBody),
            fold(throwErrors(createPlainError), identity)
          );

          const { body: bothPagesBody } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startDate: KEY_WITHIN_DATA_RANGE.time,
                endDate: LATEST_KEY_WITH_DATA.time,
                before: 'last',
                size: 20,
              })
            );
          const bothPages = pipe(
            logEntriesResponseRT.decode(bothPagesBody),
            fold(throwErrors(createPlainError), identity)
          );

          expect(bothPages.data.entries).to.eql([
            ...secondToLastPage.data.entries,
            ...lastPage.data.entries,
          ]);

          expect(bothPages.data.topCursor).to.eql(secondToLastPage.data.topCursor);
          expect(bothPages.data.bottomCursor).to.eql(lastPage.data.bottomCursor);
        });

        it('centers entries around a point', async () => {
          const { body } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startDate: EARLIEST_KEY_WITH_DATA.time,
                endDate: LATEST_KEY_WITH_DATA.time,
                center: KEY_WITHIN_DATA_RANGE,
              })
            )
            .expect(200);
          const logEntriesResponse = pipe(
            logEntriesResponseRT.decode(body),
            fold(throwErrors(createPlainError), identity)
          );

          const entries = logEntriesResponse.data.entries;
          const firstEntry = entries[0];
          const lastEntry = entries[entries.length - 1];

          expect(entries).to.have.length(200);
          expect(firstEntry.cursor.time >= EARLIEST_KEY_WITH_DATA.time).to.be(true);
          expect(lastEntry.cursor.time <= LATEST_KEY_WITH_DATA.time).to.be(true);
        });
      });
    });

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
}

const isSorted = <Value>(comparator: (first: Value, second: Value) => number) => (
  values: Value[]
) => pairs(values, comparator).every(order => order <= 0);

const ascendingTimeKey = (first: { key: InfraTimeKey }, second: { key: InfraTimeKey }) =>
  ascending(first.key.time, second.key.time) ||
  ascending(first.key.tiebreaker, second.key.tiebreaker);
