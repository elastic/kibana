/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';

import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { fold } from 'fp-ts/lib/Either';

import { createPlainError, throwErrors } from '../../../../plugins/infra/common/runtime_types';

import {
  LOG_ENTRIES_PATH,
  logEntriesRequestRT,
  logEntriesResponseRT,
  LogTimestampColumn,
  LogFieldColumn,
  LogMessageColumn,
} from '../../../../plugins/infra/common/http_api';

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

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
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
                startTimestamp: EARLIEST_KEY_WITH_DATA.time,
                endTimestamp: KEY_WITHIN_DATA_RANGE.time,
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

        it('Returns the default columns', async () => {
          const { body } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startTimestamp: EARLIEST_KEY_WITH_DATA.time,
                endTimestamp: LATEST_KEY_WITH_DATA.time,
                center: KEY_WITHIN_DATA_RANGE,
              })
            )
            .expect(200);

          const logEntriesResponse = pipe(
            logEntriesResponseRT.decode(body),
            fold(throwErrors(createPlainError), identity)
          );

          const entries = logEntriesResponse.data.entries;
          const entry = entries[0];
          expect(entry.columns).to.have.length(3);

          const timestampColumn = entry.columns[0] as LogTimestampColumn;
          expect(timestampColumn).to.have.property('timestamp');

          const eventDatasetColumn = entry.columns[1] as LogFieldColumn;
          expect(eventDatasetColumn).to.have.property('field');
          expect(eventDatasetColumn.field).to.be('event.dataset');
          expect(eventDatasetColumn).to.have.property('value');

          const messageColumn = entry.columns[2] as LogMessageColumn;
          expect(messageColumn).to.have.property('message');
          expect(messageColumn.message.length).to.be.greaterThan(0);
        });

        it('Does not build context if entry does not have all fields', async () => {
          const { body } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startTimestamp: EARLIEST_KEY_WITH_DATA.time,
                endTimestamp: LATEST_KEY_WITH_DATA.time,
                center: KEY_WITHIN_DATA_RANGE,
              })
            )
            .expect(200);

          const logEntriesResponse = pipe(
            logEntriesResponseRT.decode(body),
            fold(throwErrors(createPlainError), identity)
          );

          const entries = logEntriesResponse.data.entries;
          const entry = entries[0];
          expect(entry.context).to.eql({});
        });

        it('Paginates correctly with `after`', async () => {
          const { body: firstPageBody } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startTimestamp: EARLIEST_KEY_WITH_DATA.time,
                endTimestamp: KEY_WITHIN_DATA_RANGE.time,
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
                startTimestamp: EARLIEST_KEY_WITH_DATA.time,
                endTimestamp: KEY_WITHIN_DATA_RANGE.time,
                after: firstPage.data.bottomCursor!,
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
                startTimestamp: EARLIEST_KEY_WITH_DATA.time,
                endTimestamp: KEY_WITHIN_DATA_RANGE.time,
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
                startTimestamp: KEY_WITHIN_DATA_RANGE.time,
                endTimestamp: LATEST_KEY_WITH_DATA.time,
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
                startTimestamp: KEY_WITHIN_DATA_RANGE.time,
                endTimestamp: LATEST_KEY_WITH_DATA.time,
                before: lastPage.data.topCursor!,
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
                startTimestamp: KEY_WITHIN_DATA_RANGE.time,
                endTimestamp: LATEST_KEY_WITH_DATA.time,
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
                startTimestamp: EARLIEST_KEY_WITH_DATA.time,
                endTimestamp: LATEST_KEY_WITH_DATA.time,
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

        it('Handles empty responses', async () => {
          const startTimestamp = Date.now() + 1000;
          const endTimestamp = Date.now() + 5000;

          const { body } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startTimestamp,
                endTimestamp,
              })
            )
            .expect(200);

          const logEntriesResponse = pipe(
            logEntriesResponseRT.decode(body),
            fold(throwErrors(createPlainError), identity)
          );

          expect(logEntriesResponse.data.entries).to.have.length(0);
          expect(logEntriesResponse.data.topCursor).to.be(null);
          expect(logEntriesResponse.data.bottomCursor).to.be(null);
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

        it('returns the configured columns', async () => {
          const { body } = await supertest
            .post(LOG_ENTRIES_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesRequestRT.encode({
                sourceId: 'default',
                startTimestamp: EARLIEST_KEY_WITH_DATA.time,
                endTimestamp: LATEST_KEY_WITH_DATA.time,
                center: KEY_WITHIN_DATA_RANGE,
              })
            )
            .expect(200);

          const logEntriesResponse = pipe(
            logEntriesResponseRT.decode(body),
            fold(throwErrors(createPlainError), identity)
          );

          const entries = logEntriesResponse.data.entries;
          const entry = entries[0];

          expect(entry.columns).to.have.length(4);

          const timestampColumn = entry.columns[0] as LogTimestampColumn;
          expect(timestampColumn).to.have.property('timestamp');

          const hostNameColumn = entry.columns[1] as LogFieldColumn;
          expect(hostNameColumn).to.have.property('field');
          expect(hostNameColumn.field).to.be('host.name');
          expect(hostNameColumn).to.have.property('value');

          const eventDatasetColumn = entry.columns[2] as LogFieldColumn;
          expect(eventDatasetColumn).to.have.property('field');
          expect(eventDatasetColumn.field).to.be('event.dataset');
          expect(eventDatasetColumn).to.have.property('value');

          const messageColumn = entry.columns[3] as LogMessageColumn;
          expect(messageColumn).to.have.property('message');
          expect(messageColumn.message.length).to.be.greaterThan(0);
        });
      });
    });
  });
}
