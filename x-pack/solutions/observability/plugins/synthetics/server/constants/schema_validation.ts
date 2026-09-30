/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maximum string lengths and array sizes for route schema validation.
 *
 * These caps exist solely to prevent unbounded-string DoS — they are not
 * business-logic limits.  Keep values generous enough that no legitimate
 * request is ever rejected, and update them centrally rather than in each
 * individual route file.
 */

/** UUIDs, monitor IDs, config IDs, check groups, saved-object IDs, etc. */
export const MAX_ID_LENGTH = 1024;

/** Human-readable labels, names, tags, space IDs, connector IDs, email addresses, etc. */
export const MAX_LABEL_LENGTH = 256;

/** Datemath expressions (e.g. `now-15m`) and ISO-8601 timestamps. */
export const MAX_DATE_LENGTH = 256;

/** Free-text fields: KQL `query`, `filter`, `description`, parameter values. */
export const MAX_TEXT_LENGTH = 1024;

/** Enum-like fields: `sort`, `status`, `type`, etc. */
export const MAX_ENUM_LENGTH = 50;

/** Default maximum number of items in a validated array. */
export const MAX_ARRAY_SIZE = 1000;

/** Maximum items for "small" arrays: tags, emails, spaces, connectors, etc. */
export const MAX_SMALL_ARRAY_SIZE = 100;
