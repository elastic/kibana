/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { fold } from 'fp-ts/lib/Either';

import { createPlainError, throwErrors } from '../../../../plugins/infra/common/runtime_types';

import {
  LOG_ENTRIES_HIGHLIGHTS_PATH,
  logEntriesHighlightsRequestRT,
  logEntriesHighlightsResponseRT,
} from '../../../../plugins/infra/common/http_api';

import { FtrProviderContext } from '../../ftr_provider_context';

const KEY_BEFORE_START = {
  time: new Date('2000-01-01T00:00:00.000Z').valueOf(),
  tiebreaker: -1,
};
const KEY_AFTER_END = {
  time: new Date('2000-01-01T00:00:09.001Z').valueOf(),
  tiebreaker: 0,
};

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('log highlight apis', () => {
    before(() => esArchiver.load('infra/simple_logs'));
    after(() => esArchiver.unload('infra/simple_logs'));

    describe('/log_entries/highlights', () => {
      describe('with the default source', () => {
        before(() => esArchiver.load('empty_kibana'));
        after(() => esArchiver.unload('empty_kibana'));

        it('Handles empty responses', async () => {
          const { body } = await supertest
            .post(LOG_ENTRIES_HIGHLIGHTS_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesHighlightsRequestRT.encode({
                sourceId: 'default',
                startTimestamp: KEY_BEFORE_START.time,
                endTimestamp: KEY_AFTER_END.time,
                highlightTerms: ['some string that does not exist'],
              })
            )
            .expect(200);

          const logEntriesHighlightsResponse = pipe(
            logEntriesHighlightsResponseRT.decode(body),
            fold(throwErrors(createPlainError), identity)
          );

          expect(logEntriesHighlightsResponse.data).to.have.length(1);

          const data = logEntriesHighlightsResponse.data[0];

          expect(data.entries).to.have.length(0);
          expect(data.topCursor).to.be(null);
          expect(data.bottomCursor).to.be(null);
        });

        it('highlights built-in message column', async () => {
          const { body } = await supertest
            .post(LOG_ENTRIES_HIGHLIGHTS_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesHighlightsRequestRT.encode({
                sourceId: 'default',
                startTimestamp: KEY_BEFORE_START.time,
                endTimestamp: KEY_AFTER_END.time,
                highlightTerms: ['message of document 0'],
              })
            )
            .expect(200);

          const logEntriesHighlightsResponse = pipe(
            logEntriesHighlightsResponseRT.decode(body),
            fold(throwErrors(createPlainError), identity)
          );

          expect(logEntriesHighlightsResponse.data).to.have.length(1);

          const data = logEntriesHighlightsResponse.data[0];
          const entries = data.entries;
          const firstEntry = entries[0];
          const lastEntry = entries[entries.length - 1];

          // Finds expected entries
          expect(entries).to.have.length(10);

          // Cursors are set correctly
          expect(firstEntry.cursor).to.eql(data.topCursor);
          expect(lastEntry.cursor).to.eql(data.bottomCursor);

          // Entries fall within range
          // @kbn/expect doesn't have a `lessOrEqualThan` or `moreOrEqualThan` comparators
          expect(firstEntry.cursor.time >= KEY_BEFORE_START.time).to.be(true);
          expect(lastEntry.cursor.time <= KEY_AFTER_END.time).to.be(true);

          // All entries contain the highlights
          entries.forEach((entry) => {
            entry.columns.forEach((column) => {
              if ('message' in column && 'highlights' in column.message[0]) {
                expect(column.message[0].highlights).to.eql(['message', 'of', 'document', '0']);
              }
            });
          });
        });

        it('highlights field columns', async () => {
          const { body } = await supertest
            .post(LOG_ENTRIES_HIGHLIGHTS_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesHighlightsRequestRT.encode({
                sourceId: 'default',
                startTimestamp: KEY_BEFORE_START.time,
                endTimestamp: KEY_AFTER_END.time,
                highlightTerms: ['generate_test_data/simple_logs'],
              })
            )
            .expect(200);

          const logEntriesHighlightsResponse = pipe(
            logEntriesHighlightsResponseRT.decode(body),
            fold(throwErrors(createPlainError), identity)
          );

          expect(logEntriesHighlightsResponse.data).to.have.length(1);

          const entries = logEntriesHighlightsResponse.data[0].entries;

          // Finds expected entries
          expect(entries).to.have.length(50);

          // All entries contain the highlights
          entries.forEach((entry) => {
            entry.columns.forEach((column) => {
              if ('field' in column && 'highlights' in column && column.highlights.length > 0) {
                expect(column.highlights).to.eql(['generate_test_data/simple_logs']);
              }
            });
          });
        });

        it('applies the query as well as the highlight', async () => {
          const { body } = await supertest
            .post(LOG_ENTRIES_HIGHLIGHTS_PATH)
            .set(COMMON_HEADERS)
            .send(
              logEntriesHighlightsRequestRT.encode({
                sourceId: 'default',
                startTimestamp: KEY_BEFORE_START.time,
                endTimestamp: KEY_AFTER_END.time,
                query: JSON.stringify({
                  multi_match: { query: 'host-a', type: 'phrase', lenient: true },
                }),
                highlightTerms: ['message'],
              })
            )
            .expect(200);

          const logEntriesHighlightsResponse = pipe(
            logEntriesHighlightsResponseRT.decode(body),
            fold(throwErrors(createPlainError), identity)
          );

          expect(logEntriesHighlightsResponse.data).to.have.length(1);

          const entries = logEntriesHighlightsResponse.data[0].entries;

          // Finds expected entries
          expect(entries).to.have.length(25);

          // All entries contain the highlights
          entries.forEach((entry) => {
            entry.columns.forEach((column) => {
              if ('message' in column && 'highlights' in column.message[0]) {
                expect(column.message[0].highlights).to.eql(['message', 'message']);
              }
            });
          });
        });
      });
    });
  });
}
