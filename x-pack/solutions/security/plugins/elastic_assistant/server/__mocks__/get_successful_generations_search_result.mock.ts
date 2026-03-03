/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This mock matches the GetSuccessfulGenerationsSearchResult schema
export const getMockSuccessfulGenerationsSearchResult = () => ({
  aggregations: {
    successfull_generations_by_connector_id: {
      buckets: [
        {
          key: 'connector-1',
          doc_count: 5,
          event_actions: {
            buckets: [
              { key: 'generation-succeeded', doc_count: 3 },
              { key: 'generation-failed', doc_count: 2 },
            ],
          },
          successful_generations: { value: 3 },
          avg_event_duration_nanoseconds: { value: 1000000 },
          latest_successfull_generation: {
            value: 1620000000,
            value_as_string: '2021-05-03T00:00:00Z',
          },
        },
      ],
    },
  },
});
