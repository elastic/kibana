/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maximum YARA rule text size stored in the value field.
 * Upper-bounded by Elasticsearch `keyword` (32766 UTF-8 bytes). Reused as
 * `schema.string()` `maxLength` for greppable input bounds: JS string length is
 * always ≤ UTF-8 byte length, so ASCII can still use the full 32766 bytes.
 * Multi-byte content is constrained by `validateYaraRuleContentByteLength`.
 */
export const MAX_YARA_RULE_CONTENT_BYTE_LENGTH = 32766;

/**
 * Safe client-facing message when libyara/WASM throws. Do not interpolate engine internals.
 */
export const YARA_ENGINE_INTERNAL_ERROR_MESSAGE =
  'Unable to validate YARA rule due to an internal error.';
