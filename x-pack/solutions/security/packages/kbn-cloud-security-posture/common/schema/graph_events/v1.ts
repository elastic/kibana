/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  COUNTRY_CODES_MAX_SIZE,
  DETAIL_PAGE_SIZE_MAX,
  ENTITY_IDS_MAX_SIZE,
  ES_DOCUMENT_ID_MAX_LENGTH,
  INDEX_PATTERN_MAX_LENGTH,
  INDEX_PATTERN_REGEX,
  INDEX_PATTERNS_MAX_SIZE,
  IPS_MAX_SIZE,
  TIMESTAMP_STRING_MAX_LENGTH,
} from '../graph/v1';

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
  ips: schema.maybe(schema.arrayOf(schema.string(), { maxSize: IPS_MAX_SIZE })),
  countryCodes: schema.maybe(schema.arrayOf(schema.string(), { maxSize: COUNTRY_CODES_MAX_SIZE })),
});

export const eventsRequestSchema = schema.object({
  page: schema.object({
    index: schema.number({ min: 0 }),
    size: schema.number({ min: 1, max: DETAIL_PAGE_SIZE_MAX }),
  }),
  query: schema.object({
    eventIds: schema.arrayOf(schema.string({ maxLength: ES_DOCUMENT_ID_MAX_LENGTH }), {
      minSize: 1,
      maxSize: ENTITY_IDS_MAX_SIZE,
    }),
    start: schema.oneOf([
      schema.number(),
      schema.string({ maxLength: TIMESTAMP_STRING_MAX_LENGTH }),
    ]),
    end: schema.oneOf([schema.number(), schema.string({ maxLength: TIMESTAMP_STRING_MAX_LENGTH })]),
    indexPatterns: schema.maybe(
      schema.arrayOf(
        schema.string({
          minLength: 1,
          maxLength: INDEX_PATTERN_MAX_LENGTH,
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
    events: schema.arrayOf(eventOrAlertItemSchema, { maxSize: DETAIL_PAGE_SIZE_MAX }),
    totalRecords: schema.number(),
  });
