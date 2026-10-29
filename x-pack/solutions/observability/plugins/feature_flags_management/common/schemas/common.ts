/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { LIMITS } from '../constants';

/** App and environment keys: lowercase, URL-safe, and free of the `:` used in document IDs. */
export const ENTITY_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
/** Flag keys also allow dots and uppercase letters, for example `discover.cascadeLayoutEnabled`. */
export const FLAG_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export const environmentKeySchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(LIMITS.entityKeyMaxLength)
    .regex(ENTITY_KEY_PATTERN)
    .describe('Unique environment key, for example `production`.')
);

export const appKeySchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(LIMITS.entityKeyMaxLength)
    .regex(ENTITY_KEY_PATTERN)
    .describe('Unique app key, for example `kibana`.')
);

export const flagKeySchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(LIMITS.flagKeyMaxLength)
    .regex(FLAG_KEY_PATTERN)
    .describe('Unique flag key, for example `discover.cascadeLayoutEnabled`.')
);

export const nameSchema = lazySchema(() => z.string().trim().min(1).max(LIMITS.nameMaxLength));
export const descriptionSchema = lazySchema(() => z.string().max(LIMITS.descriptionMaxLength));

export const versionSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(LIMITS.versionMaxLength)
    .describe(
      'Opaque version returned by a previous read. When provided, the write fails with 409 if the document changed since.'
    )
);

export const deleteQuerySchema = lazySchema(() => z.object({ version: versionSchema.optional() }));

export const timestampsSchema = lazySchema(() =>
  z.object({
    created_at: z.string().describe('Set by Kibana when the document is created.'),
    updated_at: z.string().describe('Set by Kibana on every write.'),
    version: z.string().describe('Opaque version for optimistic concurrency control.'),
  })
);

export const pageQuerySchema = lazySchema(() =>
  z.coerce.number().int().min(1).max(LIMITS.maxPage).default(1).describe('1-based page number.')
);

export const entityListQuerySchema = lazySchema(() =>
  z.object({
    page: pageQuerySchema,
    per_page: z.coerce.number().int().min(1).max(LIMITS.maxEntitiesPerPage).default(100),
  })
);

export const paginationSchema = lazySchema(() =>
  z.object({
    total: z.number(),
    page: z.number(),
    per_page: z.number(),
  })
);

export const errorResponseSchema = lazySchema(() =>
  z.object({
    statusCode: z.number(),
    error: z.string().optional(),
    message: z.string(),
    attributes: z
      .object({
        issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
      })
      .optional(),
  })
);

export type EntityListQuery = z.input<typeof entityListQuerySchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
