/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/** Monitor ids and check groups. Heartbeat ids are sometimes full URLs. */
export const MAX_ID_LENGTH = 2048;
/** `observer.geo.name` labels. */
export const MAX_LOCATION_NAME_LENGTH = 512;
/** Datemath (`now-15m`) or an ISO-8601 timestamp. */
export const MAX_DATE_RANGE_LENGTH = 256;
/** `@timestamp` on the last-successful-check route. */
export const MAX_TIMESTAMP_LENGTH = 64;
/** KQL and serialized Elasticsearch filter clauses. */
export const MAX_FILTER_LENGTH = 10_000;
/**
 * JSON list of `observer.geo.name` labels on the pings route.
 * 4KB covers ~100 names (~40 chars each); a full public location set is well under that.
 */
export const MAX_LOCATION_LIST_LENGTH = 4096;
/** Cursor pagination JSON. ~100 bytes of wrapper plus a monitor id (max 2048). */
export const MAX_PAGINATION_LENGTH = 4096;
export const MAX_STATUS_LENGTH = 32;
export const MAX_SORT_LENGTH = 16;
export const MAX_BUCKET_SIZE_LENGTH = 64;
export const MAX_TIME_ZONE_LENGTH = 128;
/** Synthetics event types such as `step/end`. */
export const MAX_EVENT_TYPE_LENGTH = 128;
/** Screenshot block hashes. */
export const MAX_HASH_LENGTH = 256;
/** Comma-separated heartbeat index patterns. */
export const MAX_INDEX_PATTERN_LENGTH = 4096;
/** Connector ids (~36) and email addresses (≤254). */
export const MAX_SETTINGS_STRING_LENGTH = 256;
export const MAX_SETTINGS_LIST_SIZE = 100;

export const boundedString = (maxLength: number) => schema.string({ maxLength });

export const optionalBoundedString = (maxLength: number) => schema.maybe(boundedString(maxLength));

export const boundedStringArray = (maxLength: number, maxSize: number) =>
  schema.arrayOf(boundedString(maxLength), { maxSize });
