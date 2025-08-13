/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const getEntityStoreAggsQuery = (index: string) => ({
  size: 0,
  index,
  aggs: {
    aggregations: {
      terms: {
        field: 'entity.store',
        size: 5,
        order: {
          last_doc_timestamp: 'desc',
        },
      },
      aggs: {
        last_doc_timestamp: {
          max: {
            field: '@timestamp',
          },
        },
      },
    },
  },
});
