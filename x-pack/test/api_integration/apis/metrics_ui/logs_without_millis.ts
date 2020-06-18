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

import { FtrProviderContext } from '../../ftr_provider_context';
import {
  LOG_ENTRIES_SUMMARY_PATH,
  logEntriesSummaryRequestRT,
  logEntriesSummaryResponseRT,
  LOG_ENTRIES_PATH,
  logEntriesRequestRT,
  logEntriesResponseRT,
} from '../../../../plugins/infra/common/http_api/log_entries';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};
const EARLIEST_KEY_WITH_DATA = {
  time: new Date('2019-01-05T23:59:23.000Z').valueOf(),
  tiebreaker: -1,
};
const LATEST_KEY_WITH_DATA = {
  time: new Date('2019-01-06T23:59:23.000Z').valueOf(),
  tiebreaker: 2,
};
const KEY_WITHIN_DATA_RANGE = {
  time: new Date('2019-01-06T00:00:00.000Z').valueOf(),
  tiebreaker: 0,
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('logs without epoch_millis format', () => {
    before(() => esArchiver.load('infra/logs_without_epoch_millis'));
    after(() => esArchiver.unload('infra/logs_without_epoch_millis'));

    describe('/log_entries/summary', () => {
      it('returns non-empty buckets', async () => {
        const startTimestamp = EARLIEST_KEY_WITH_DATA.time;
        const endTimestamp = LATEST_KEY_WITH_DATA.time + 1; // the interval end is exclusive
        const bucketSize = Math.ceil((endTimestamp - startTimestamp) / 10);

        const { body } = await supertest
          .post(LOG_ENTRIES_SUMMARY_PATH)
          .set(COMMON_HEADERS)
          .send(
            logEntriesSummaryRequestRT.encode({
              sourceId: 'default',
              startTimestamp,
              endTimestamp,
              bucketSize,
              query: null,
            })
          )
          .expect(200);

        const logSummaryResponse = pipe(
          logEntriesSummaryResponseRT.decode(body),
          fold(throwErrors(createPlainError), identity)
        );

        expect(
          logSummaryResponse.data.buckets.filter((bucket: any) => bucket.entriesCount > 0)
        ).to.have.length(2);
      });
    });

    describe('/log_entries/entries', () => {
      it('returns log entries', async () => {
        const startTimestamp = EARLIEST_KEY_WITH_DATA.time;
        const endTimestamp = LATEST_KEY_WITH_DATA.time + 1; // the interval end is exclusive

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
        expect(logEntriesResponse.data.entries).to.have.length(2);
      });

      it('returns log entries when centering around a point', async () => {
        const startTimestamp = EARLIEST_KEY_WITH_DATA.time;
        const endTimestamp = LATEST_KEY_WITH_DATA.time + 1; // the interval end is exclusive

        const { body } = await supertest
          .post(LOG_ENTRIES_PATH)
          .set(COMMON_HEADERS)
          .send(
            logEntriesRequestRT.encode({
              sourceId: 'default',
              startTimestamp,
              endTimestamp,
              center: KEY_WITHIN_DATA_RANGE,
            })
          )
          .expect(200);

        const logEntriesResponse = pipe(
          logEntriesResponseRT.decode(body),
          fold(throwErrors(createPlainError), identity)
        );
        expect(logEntriesResponse.data.entries).to.have.length(2);
      });
    });
  });
}
