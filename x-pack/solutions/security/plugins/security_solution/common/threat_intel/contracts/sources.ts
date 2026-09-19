/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

// ── list_sources ─────────────────────────────────────────────────────────────

export const listSourcesBodySchema = schema.object({
  size: schema.maybe(schema.number({ min: 1, max: 500 })),
  time_range: schema.maybe(
    schema.object({
      from: schema.string({ maxLength: 64 }),
      to: schema.string({ maxLength: 64 }),
    })
  ),
});

const listSourcesItemSchema = schema.object({
  source_id: schema.string(),
  name: schema.maybe(schema.string()),
  adapter_type: schema.maybe(schema.string()),
  enabled: schema.maybe(schema.boolean()),
  url: schema.maybe(schema.string()),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  created_at: schema.maybe(schema.string()),
  updated_at: schema.maybe(schema.string()),
  space_id: schema.maybe(schema.string()),
  // Count of threat reports attributed to this source name.
  report_count: schema.number(),
  // Latest `lineage.ingested_at` across reports for this source.
  last_ingested_at: schema.maybe(schema.string()),
  // Sum of `evidence.alert_hits_total` across reports for this source.
  env_hits_total: schema.number(),
});

export type ListSourcesItem = TypeOf<typeof listSourcesItemSchema>;

export const listSourcesResponseSchema = schema.object({
  total: schema.number(),
  sources: schema.arrayOf(listSourcesItemSchema),
});

export type ListSourcesResponse = TypeOf<typeof listSourcesResponseSchema>;

// ── update_source ────────────────────────────────────────────────────────────

/**
 * The only field an operator can change on an approved source. The catalog is
 * fixed, so name, URL, adapter type, tags, and vendor are not mutable — a strict
 * `schema.object` rejects any other key with a 400.
 */
export const updateSourceBodySchema = schema.object({
  enabled: schema.boolean(),
});

export const sourceIdParamsSchema = schema.object({
  sourceId: schema.string({ minLength: 1, maxLength: 256 }),
});

export const updateSourceResponseSchema = schema.object({
  source_id: schema.string(),
  updated: schema.literal(true),
});

export type UpdateSourceResponse = TypeOf<typeof updateSourceResponseSchema>;
