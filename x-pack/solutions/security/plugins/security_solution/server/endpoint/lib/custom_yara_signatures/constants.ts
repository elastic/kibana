/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { MAX_YARA_RULE_CONTENT_BYTE_LENGTH } from '../../../../common/endpoint/service/artifacts/constants';

/**
 * Safe client-facing message when libyara/WASM throws. Do not interpolate engine internals.
 */
export const YARA_ENGINE_INTERNAL_ERROR_MESSAGE =
  'Unable to validate YARA rule due to an internal error.';
