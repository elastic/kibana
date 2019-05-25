/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { pairs } from 'd3-array';
import gql from 'graphql-tag';

import { KbnTestProvider } from './types';

const EARLIEST_TIME_WITH_DATA = new Date('2018-10-17T19:42:22.000Z').valueOf();
const LATEST_TIME_WITH_DATA = new Date('2018-10-17T19:57:21.611Z').valueOf();

const logSummaryBetweenQuery = gql`
  query LogSummary(
    $sourceId: ID = "default"
    $start: Float!
    $end: Float!
    $bucketSize: Float!
    $filterQuery: String
  ) {
    source(id: $sourceId) {
      id
      logSummaryBetween(
        start: $start
        end: $end
        bucketSize: $bucketSize
        filterQuery: $filterQuery
      ) {
        start
        end
        buckets {
          start
          end
          entriesCount
        }
      }
    }
  }
`;

const logSummaryTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('logSummaryBetween', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));

    it('should return empty and non-empty consecutive buckets', async () => {
      const start = EARLIEST_TIME_WITH_DATA;
      const end = LATEST_TIME_WITH_DATA + (LATEST_TIME_WITH_DATA - EARLIEST_TIME_WITH_DATA);
      const bucketSize = Math.ceil((end - start) / 10);

      const {
        data: {
          source: { logSummaryBetween },
        },
      } = await client.query<any>({
        query: logSummaryBetweenQuery,
        variables: {
          start,
          end,
          bucketSize,
        },
      });

      expect(logSummaryBetween).to.have.property('buckets');
      expect(logSummaryBetween.buckets).to.have.length(10);
      expect(
        logSummaryBetween.buckets.filter((bucket: any) => bucket.entriesCount > 0)
      ).to.have.length(5);
      expect(
        pairs(
          logSummaryBetween.buckets,
          (first: any, second: any) => first.end === second.start
        ).every(pair => pair)
      ).to.equal(true);
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default logSummaryTests;
