/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { pairs } from 'd3-array';

import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { fold } from 'fp-ts/lib/Either';

import { createPlainError, throwErrors } from '../../../../plugins/infra/common/runtime_types';

import {
  LOG_ENTRIES_SUMMARY_PATH,
  logEntriesSummaryRequestRT,
  logEntriesSummaryResponseRT,
} from '../../../../plugins/infra/common/http_api/log_entries';

import { FtrProviderContext } from '../../ftr_provider_context';

const EARLIEST_TIME_WITH_DATA = new Date('2018-10-17T19:42:22.000Z').valueOf();
const LATEST_TIME_WITH_DATA = new Date('2018-10-17T19:57:21.611Z').valueOf();

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('logSummaryBetween', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));

    it('should return empty and non-empty consecutive buckets', async () => {
      const startTimestamp = EARLIEST_TIME_WITH_DATA;
      const endTimestamp =
        LATEST_TIME_WITH_DATA + (LATEST_TIME_WITH_DATA - EARLIEST_TIME_WITH_DATA);
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

      expect(logSummaryResponse.data.buckets).to.have.length(10);
      expect(
        logSummaryResponse.data.buckets.filter((bucket: any) => bucket.entriesCount > 0)
      ).to.have.length(5);
      expect(
        pairs(
          logSummaryResponse.data.buckets,
          (first: any, second: any) => first.end === second.start
        ).every((pair) => pair)
      ).to.equal(true);
    });
  });
}
