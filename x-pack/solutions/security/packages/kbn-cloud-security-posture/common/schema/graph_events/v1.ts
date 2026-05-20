/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INDEX_PATTERN_REGEX, INDEX_PATTERNS_MAX_SIZE } from '../graph/v1';

// ============================================
// SHARED AUXILIARY SCHEMAS (not exported)
// ============================================

const actorOrTargetSchema = schema.object({
  id: schema.string(),
  icon: schema.maybe(schema.string()),
  name: schema.maybe(schema.string()),
});

// ============================================
// EVENTS ENDPOINT: /internal/cloud_security_posture/graph/events
// ============================================

export const eventOrAlertItemSchema = schema.object({
  id: schema.string(),
  isAlert: schema.boolean(),
  index: schema.maybe(schema.string()),
  timestamp: schema.maybe(schema.string()),
  action: schema.maybe(schema.string()),
  actor: schema.maybe(actorOrTargetSchema),
  target: schema.maybe(actorOrTargetSchema),
  // codeql[js/kibana/unbounded-array-in-schema] ES-derived event fields in response body
  ips: schema.maybe(schema.arrayOf(schema.string())),
  // codeql[js/kibana/unbounded-array-in-schema] ES-derived event fields in response body
  countryCodes: schema.maybe(schema.arrayOf(schema.string())),
});

export const eventsRequestSchema = schema.object({
  page: schema.object({
    index: schema.number({ min: 0 }),
    size: schema.number({ min: 1, max: 100 }),
  }),
  query: schema.object({
    eventIds: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 5000 }),
    start: schema.oneOf([schema.number(), schema.string()]),
    end: schema.oneOf([schema.number(), schema.string()]),
    indexPatterns: schema.maybe(
      schema.arrayOf(
        schema.string({
          minLength: 1,
          validate: (value) => {
            if (!INDEX_PATTERN_REGEX.test(value)) {
              return `Invalid index pattern: ${value}. Contains illegal characters.`;
            }
          },
        }),
        { minSize: 1, maxSize: INDEX_PATTERNS_MAX_SIZE }
      )
    ),
  }),
});

export const eventsResponseSchema = () =>
  schema.object({
    // codeql[js/kibana/unbounded-array-in-schema] Server-paginated response; size enforced in handler, not request DoS input
    events: schema.arrayOf(eventOrAlertItemSchema),
    totalRecords: schema.number(),
  });
