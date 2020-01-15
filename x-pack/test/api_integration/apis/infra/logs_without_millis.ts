/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ascending, pairs } from 'd3-array';
import gql from 'graphql-tag';

import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { fold } from 'fp-ts/lib/Either';

import { createPlainError, throwErrors } from '../../../../plugins/infra/common/runtime_types';

import { FtrProviderContext } from '../../ftr_provider_context';
import { sharedFragments } from '../../../../plugins/infra/common/graphql/shared';
import { InfraTimeKey } from '../../../../plugins/infra/public/graphql/types';
import {
  LOG_ENTRIES_SUMMARY_PATH,
  logEntriesSummaryRequestRT,
  logEntriesSummaryResponseRT,
} from '../../../../plugins/infra/common/http_api/log_entries';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};
const KEY_WITHIN_DATA_RANGE = {
  time: new Date('2019-01-06T00:00:00.000Z').valueOf(),
  tiebreaker: 0,
};
const EARLIEST_KEY_WITH_DATA = {
  time: new Date('2019-01-05T23:59:23.000Z').valueOf(),
  tiebreaker: -1,
};
const LATEST_KEY_WITH_DATA = {
  time: new Date('2019-01-06T23:59:23.000Z').valueOf(),
  tiebreaker: 2,
};

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');
  const supertest = getService('supertest');

  describe('logs without epoch_millis format', () => {
    before(() => esArchiver.load('infra/logs_without_epoch_millis'));
    after(() => esArchiver.unload('infra/logs_without_epoch_millis'));

    it('logEntriesAround should return log entries', async () => {
      const {
        data: {
          source: { logEntriesAround },
        },
      } = await client.query<any>({
        query: logEntriesAroundQuery,
        variables: {
          timeKey: KEY_WITHIN_DATA_RANGE,
          countBefore: 1,
          countAfter: 1,
        },
      });

      expect(logEntriesAround).to.have.property('entries');
      expect(logEntriesAround.entries).to.have.length(2);
      expect(isSorted(ascendingTimeKey)(logEntriesAround.entries)).to.equal(true);

      expect(logEntriesAround.hasMoreBefore).to.equal(false);
      expect(logEntriesAround.hasMoreAfter).to.equal(false);
    });

    it('logEntriesBetween should return log entries', async () => {
      const {
        data: {
          source: { logEntriesBetween },
        },
      } = await client.query<any>({
        query: logEntriesBetweenQuery,
        variables: {
          startKey: EARLIEST_KEY_WITH_DATA,
          endKey: LATEST_KEY_WITH_DATA,
        },
      });

      expect(logEntriesBetween).to.have.property('entries');
      expect(logEntriesBetween.entries).to.have.length(2);
      expect(isSorted(ascendingTimeKey)(logEntriesBetween.entries)).to.equal(true);
    });

    it('logSummaryBetween should return non-empty buckets', async () => {
      const startDate = EARLIEST_KEY_WITH_DATA.time;
      const endDate = LATEST_KEY_WITH_DATA.time + 1; // the interval end is exclusive
      const bucketSize = Math.ceil((endDate - startDate) / 10);

      const { body } = await supertest
        .post(LOG_ENTRIES_SUMMARY_PATH)
        .set(COMMON_HEADERS)
        .send(
          logEntriesSummaryRequestRT.encode({
            sourceId: 'default',
            startDate,
            endDate,
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
}

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

const isSorted = <Value>(comparator: (first: Value, second: Value) => number) => (
  values: Value[]
) => pairs(values, comparator).every(order => order <= 0);

const ascendingTimeKey = (first: { key: InfraTimeKey }, second: { key: InfraTimeKey }) =>
  ascending(first.key.time, second.key.time) ||
  ascending(first.key.tiebreaker, second.key.tiebreaker);
