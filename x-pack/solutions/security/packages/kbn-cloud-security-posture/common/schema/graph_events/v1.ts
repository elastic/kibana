/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  COUNTRY_CODE_MAX_LENGTH,
  COUNTRY_CODES_MAX_SIZE,
  DETAIL_PAGE_SIZE_MAX,
  ENTITY_ID_MAX_LENGTH,
  ENUM_LIKE_MAX_LENGTH,
  INDEX_NAME_MAX_LENGTH,
  INDEX_PATTERN_REGEX,
  INDEX_PATTERNS_MAX_SIZE,
  IP_ADDRESS_MAX_LENGTH,
  IPS_MAX_SIZE,
  LABEL_MAX_LENGTH,
  TIMESTAMP_STRING_MAX_LENGTH,
} from '../graph/v1';

// ============================================
// SHARED AUXILIARY SCHEMAS (not exported)
// ============================================

const actorOrTargetSchema = schema.object({
  id: schema.string({ maxLength: ENTITY_ID_MAX_LENGTH }),
  icon: schema.maybe(schema.string({ maxLength: ENUM_LIKE_MAX_LENGTH })),
  name: schema.maybe(schema.string({ maxLength: LABEL_MAX_LENGTH })),
});

// ============================================
// EVENTS ENDPOINT: /internal/cloud_security_posture/graph/events
// ============================================

export const eventOrAlertItemSchema = schema.object({
  id: schema.string({ maxLength: ENTITY_ID_MAX_LENGTH }),
  isAlert: schema.boolean(),
  index: schema.maybe(schema.string({ maxLength: INDEX_NAME_MAX_LENGTH })),
  timestamp: schema.maybe(schema.string({ maxLength: TIMESTAMP_STRING_MAX_LENGTH })),
  action: schema.maybe(schema.string({ maxLength: LABEL_MAX_LENGTH })),
  actor: schema.maybe(actorOrTargetSchema),
  target: schema.maybe(actorOrTargetSchema),
  ips: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: IP_ADDRESS_MAX_LENGTH }), {
      maxSize: IPS_MAX_SIZE,
    })
  ),
  countryCodes: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: COUNTRY_CODE_MAX_LENGTH }), {
      maxSize: COUNTRY_CODES_MAX_SIZE,
    })
  ),
});

export const eventsRequestSchema = schema.object({
  page: schema.object({
    index: schema.number({ min: 0 }),
    size: schema.number({ min: 1, max: DETAIL_PAGE_SIZE_MAX }),
  }),
  query: schema.object({
    eventIds: schema.arrayOf(schema.string({ maxLength: ENTITY_ID_MAX_LENGTH }), {
      minSize: 1,
      maxSize: 5000,
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
          maxLength: INDEX_NAME_MAX_LENGTH,
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
