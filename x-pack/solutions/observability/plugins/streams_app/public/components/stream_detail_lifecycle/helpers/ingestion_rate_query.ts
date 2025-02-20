/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ingestionRateQuery = ({
  index,
  start,
  end,
  interval,
  timestampField = '@timestamp',
}: {
  index: string;
  start: string;
  end: string;
  interval: string;
  timestampField?: string;
}) => {
  return {
    index,
    track_total_hits: false,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [{ range: { [timestampField]: { gte: start, lte: end } } }],
        },
      },
      aggs: {
        docs_count: {
          date_histogram: {
            field: timestampField,
            fixed_interval: interval,
            min_doc_count: 0,
          },
        },
      },
    },
  };
};
