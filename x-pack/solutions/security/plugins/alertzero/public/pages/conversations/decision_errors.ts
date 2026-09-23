/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';
import { DECISION_ERRORS } from './translations';

/**
 * The proposals route distinguishes why a decision was refused — 410 the deadline passed,
 * 409 someone decided first or the action input drifted, 400 an input the action rejects.
 * The shared mutations have no `onError`, so the caller has to surface it or the dialog
 * just closes as though the decision had landed.
 */
export const decisionErrorMessage = (error: unknown): string => {
  const status = isHttpFetchError(error) ? error.response?.status : undefined;
  return DECISION_ERRORS[status ?? 0] ?? DECISION_ERRORS.default;
};
