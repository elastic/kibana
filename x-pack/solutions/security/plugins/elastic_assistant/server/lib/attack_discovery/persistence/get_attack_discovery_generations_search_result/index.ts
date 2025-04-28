/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export type GetAttackDiscoveryGenerationsSearchResult = z.infer<
  typeof GetAttackDiscoveryGenerationsSearchResult
>;
export const GetAttackDiscoveryGenerationsSearchResult = z.object({
  aggregations: z.object({
    generations: z.object({
      buckets: z.array(
        z.object({
          key: z.string(), // UUID of the generation
          doc_count: z.number(),
          alerts_context_count: z.object({
            value: z.number().nullable().optional(),
          }),
          connector_id: z.object({
            buckets: z.array(
              z.object({
                key: z.string(),
                doc_count: z.number(),
              })
            ),
          }),
          discoveries: z.object({
            value: z.number().nullable().optional(),
          }),
          event_actions: z.object({
            buckets: z.array(
              z.object({
                key: z.string(),
                doc_count: z.number(),
              })
            ),
          }),
          event_reason: z.object({
            buckets: z.array(
              z.object({
                key: z.string(),
                doc_count: z.number(),
              })
            ),
          }),
          loading_message: z.object({
            buckets: z.array(
              z.object({
                key: z.string(),
                doc_count: z.number(),
              })
            ),
          }),
          generation_end_time: z.object({
            value_as_string: z.string().nullable().optional(),
          }),
          generation_start_time: z.object({
            value_as_string: z.string().nullable().optional(), // optional to handle missing values
          }),
        })
      ),
    }),
  }),
});
