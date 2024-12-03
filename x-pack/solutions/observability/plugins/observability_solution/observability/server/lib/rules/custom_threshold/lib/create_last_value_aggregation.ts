/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createLastValueAggBucketScript = (key: string, field?: string) => {
  return {
    [key]: {
      bucket_script: {
        buckets_path: {
          last_value: `_${key}>last_value[${field}]`,
        },
        script: `params.last_value`,
      },
    },
  };
};

export const createLastValueAggBucket = (key: string, timeFieldName: string, field?: string) => {
  return {
    [`_${key}`]: {
      filter: {
        bool: {
          must: [
            {
              exists: {
                field,
              },
            },
          ],
        },
      },
      aggs: {
        last_value: {
          top_metrics: {
            metrics: { field },
            sort: { [timeFieldName]: 'desc' },
          },
        },
      },
    },
  };
};
