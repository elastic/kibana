/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// Session View accepts cross-cluster index expressions. Remote cluster aliases
// are limited to 1000 characters and are followed by a colon and an index
// pattern of at most 256 characters.
const SESSION_VIEW_INDEX_PATTERN_MAX_LENGTH = 1000 + 1 + 256;

// Session entity IDs are compound process.entry_leader.entity_id values. 1024
// accommodates the observed formats while keeping request parsing bounded.
const SESSION_ENTITY_ID_MAX_LENGTH = 1024;

// Session start times and pagination cursors are ISO 8601 timestamps. 100
// characters covers valid timestamp forms with ample headroom.
const SESSION_TIMESTAMP_MAX_LENGTH = 100;

// Detection alert identifiers include UUID v4 values and 64-character hashes.
const ALERT_ID_MAX_LENGTH = 64;

export const sessionViewIndexPatternSchema = schema.string({
  maxLength: SESSION_VIEW_INDEX_PATTERN_MAX_LENGTH,
});
export const sessionEntityIdSchema = schema.string({ maxLength: SESSION_ENTITY_ID_MAX_LENGTH });
export const sessionTimestampSchema = schema.string({ maxLength: SESSION_TIMESTAMP_MAX_LENGTH });
export const alertIdSchema = schema.string({ maxLength: ALERT_ID_MAX_LENGTH });
