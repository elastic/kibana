/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * User-facing messages surfaced through `last_execution.error` when populating
 * the ELSER-backed indices fails during migration initialization.
 */
export const ELSER_COLD_START_MESSAGE =
  'ELSER is still starting up. Please wait a moment and retry the migration.';

export const ELSER_NOT_DEPLOYED_MESSAGE =
  'The ELSER model is not deployed. Please deploy and start ELSER at Machine Learning > Trained Models, then retry the migration.';

export const ELSER_NO_ML_CAPACITY_MESSAGE =
  'ELSER could not be started because there is no available machine learning capacity. Please ensure an ML node with sufficient capacity is available, then retry the migration.';

/**
 * Extracts an Elasticsearch error `type` from an error thrown while populating the
 * ELSER indices. The error may arrive either as:
 *  - an `ElserPopulateError` preserved by the data client (`type` set directly), or
 *  - a raw `@elastic/elasticsearch` `ResponseError` (`meta.body.error.type`).
 */
const getEsErrorType = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const candidate = error as {
    type?: unknown;
    meta?: { body?: { error?: { type?: unknown } } };
  };
  const directType = candidate.type;
  if (typeof directType === 'string') {
    return directType;
  }
  const bodyType = candidate.meta?.body?.error?.type;
  return typeof bodyType === 'string' ? bodyType : undefined;
};

const getEsStatusCode = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const { statusCode } = error as { statusCode?: unknown };
  return typeof statusCode === 'number' ? statusCode : undefined;
};

/**
 * Classifies an error thrown while populating the ELSER indices and returns the
 * corresponding user-facing message, or `undefined` when the error is not a
 * recognized ELSER condition (the caller should rethrow the original error).
 *
 * Classification keys on the stable Elasticsearch `error.type` (with HTTP status as
 * a secondary signal) rather than the human-readable reason string, which is not
 * version-stable.
 *
 * - `model_deployment_timeout_exception` / 408: ELSER is deployed but still scaling
 *   up from zero allocations (cold start) — transient, the user should retry.
 * - `resource_not_found_exception` / 404: the ELSER model/endpoint is genuinely
 *   absent — the user must deploy it.
 * - `status_exception` (no suitable/ML nodes): there is no ML capacity to start ELSER.
 */
export const getElserErrorMessage = (error: unknown): string | undefined => {
  const type = getEsErrorType(error);
  const statusCode = getEsStatusCode(error);

  if (type === 'model_deployment_timeout_exception' || statusCode === 408) {
    return ELSER_COLD_START_MESSAGE;
  }

  if (type === 'resource_not_found_exception' || statusCode === 404) {
    return ELSER_NOT_DEPLOYED_MESSAGE;
  }

  if (type === 'status_exception') {
    return ELSER_NO_ML_CAPACITY_MESSAGE;
  }

  return undefined;
};
