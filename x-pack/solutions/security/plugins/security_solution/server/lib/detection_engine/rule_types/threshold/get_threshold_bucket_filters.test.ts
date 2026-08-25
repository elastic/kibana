/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP } from '@kbn/rule-data-utils';
import { sampleThresholdSignalHistory } from '../__mocks__/threshold';
import { getThresholdBucketFilters } from './get_threshold_bucket_filters';

describe('getThresholdBucketFilters', () => {
  it('should generate filters for threshold signal detection with dupe mitigation', async () => {
    const result = await getThresholdBucketFilters({
      signalHistory: sampleThresholdSignalHistory(),
      aggregatableTimestampField: TIMESTAMP,
    });
    expect(result).toEqual([
      {
        bool: {
          must_not: [
            {
              bool: {
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        lte: '2020-12-17T16:28:00.000Z',
                      },
                    },
                  },
                  {
                    term: {
                      'host.name': 'garden-gnomes',
                    },
                  },
                  {
                    term: {
                      'source.ip': '127.0.0.1',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
  });
});
