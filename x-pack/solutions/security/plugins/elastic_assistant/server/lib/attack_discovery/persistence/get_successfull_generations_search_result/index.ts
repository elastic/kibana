/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export type GetSuccessfulGenerationsSearchResult = z.infer<
  typeof GetSuccessfulGenerationsSearchResult
>;

export const GetSuccessfulGenerationsSearchResult = z.object({
  aggregations: z.object({
    successfull_generations_by_connector_id: z.object({
      buckets: z.array(
        z.object({
          key: z.string(), // Connector ID
          doc_count: z.number(), // Total document count for this connector
          event_actions: z.object({
            buckets: z.array(
              z.object({
                key: z.string(), // Event action (e.g., "generation-succeeded")
                doc_count: z.number(), // Count of this event action
              })
            ),
          }),
          successful_generations: z.object({
            value: z.number(), // Count of successful generations
          }),
          avg_event_duration_nanoseconds: z.object({
            value: z.number().nullable(), // Average event duration in nanoseconds
          }),
          latest_successfull_generation: z.object({
            value: z.number().nullable(), // Latest successful generation timestamp (epoch)
            value_as_string: z.string().nullable(), // Latest successful generation timestamp (ISO string)
          }),
        })
      ),
    }),
  }),
});
