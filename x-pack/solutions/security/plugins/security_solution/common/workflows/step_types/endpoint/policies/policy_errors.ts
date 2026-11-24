/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const POLICY_ERROR_IDENTITIES = [
  'not_authorized',
  'not_found',
  'ambiguous_name',
  'invalid_policy',
  'baseline_unavailable',
  'version_conflict',
  'blocked_change',
  'no_change',
  'write_rejected',
  'write_unverified',
  'rejected_operations',
  'invalid_input',
  'unknown_error',
] as const;
