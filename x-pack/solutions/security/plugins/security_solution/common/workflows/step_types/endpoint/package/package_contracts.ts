/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { boundedStringSchema, countSchema } from '../hosts/hosts_contracts';

export const MAX_PACKAGE_TRANSFORMS = 10;
export const MAX_PACKAGE_INDICES = 20;
export const MAX_PACKAGE_PIPELINES = 10;

export const packageInfoSchema = lazySchema(() =>
  z.object({
    name: boundedStringSchema,
    version: boundedStringSchema,
    latestVersion: boundedStringSchema,
    installationInfo: z
      .object({
        version: boundedStringSchema,
        install_status: boundedStringSchema,
      })
      .optional(),
  })
);

export const packageTransformSchema = lazySchema(() =>
  z.object({
    id: boundedStringSchema,
    state: boundedStringSchema.optional(),
    reason: boundedStringSchema.optional(),
    health: z.object({ status: boundedStringSchema }).optional(),
    stats: z.object({ documents_processed: countSchema }).optional(),
    frequency: boundedStringSchema.optional(),
    sync: z.object({ time: z.object({ delay: boundedStringSchema }) }).optional(),
    settings: z.object({ max_page_search_size: countSchema }).optional(),
    default: z
      .object({
        frequency: boundedStringSchema.optional(),
        sync: z.object({ time: z.object({ delay: boundedStringSchema }) }).optional(),
        settings: z.object({ max_page_search_size: countSchema }).optional(),
      })
      .optional(),
    failing: z.boolean(),
  })
);

export const packageIndexSettingsSchema = lazySchema(() =>
  z.object({
    index: boundedStringSchema,
    settings: z
      .object({
        index: z
          .object({
            number_of_shards: boundedStringSchema.optional(),
            number_of_replicas: boundedStringSchema.optional(),
            refresh_interval: boundedStringSchema.optional(),
            default_pipeline: boundedStringSchema.optional(),
            final_pipeline: boundedStringSchema.optional(),
            lifecycle: z.object({ name: boundedStringSchema }).optional(),
          })
          .optional(),
      })
      .optional(),
  })
);

export const packagePipelineSchema = lazySchema(() =>
  z.object({
    id: boundedStringSchema,
  })
);

export const packageNodesSchema = lazySchema(() =>
  z.object({
    count: countSchema,
    roles: z.record(boundedStringSchema, countSchema),
  })
);

export const packageConfigurationsSchema = lazySchema(() =>
  z.object({
    transforms: z.array(packageTransformSchema).max(MAX_PACKAGE_TRANSFORMS).optional(),
    transforms_total: countSchema.optional(),
    indices: z.array(packageIndexSettingsSchema).max(MAX_PACKAGE_INDICES).optional(),
    indices_total: countSchema.optional(),
    pipelines: z.array(packagePipelineSchema).max(MAX_PACKAGE_PIPELINES).optional(),
    pipelines_total: countSchema.optional(),
    nodes: packageNodesSchema.optional(),
  })
);
