/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP_FIELD } from '../../../../common/constants';
import { ESSearchClient } from '../../../lib/metrics/types';

interface EventDatasetHit {
  _source: {
    event?: {
      dataset?: string;
    };
  };
}

export const getDatasetForField = async (
  client: ESSearchClient,
  field: string,
  indexPattern: string,
  timerange: { to: number; from: number }
) => {
  const params = {
    allow_no_indices: true,
    ignore_unavailable: true,
    terminate_after: 1,
    index: indexPattern,
    body: {
      query: {
        bool: {
          filter: [
            { exists: { field } },
            {
              range: {
                [TIMESTAMP_FIELD]: {
                  gte: timerange.from,
                  lte: timerange.to,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      size: 1,
      _source: ['event.dataset'],
      sort: [{ [TIMESTAMP_FIELD]: { order: 'desc' } }],
    },
  };

  const response = await client<EventDatasetHit>(params);

  if (response.hits.total.value === 0) {
    return null;
  }

  return response.hits.hits?.[0]._source.event?.dataset;
};
