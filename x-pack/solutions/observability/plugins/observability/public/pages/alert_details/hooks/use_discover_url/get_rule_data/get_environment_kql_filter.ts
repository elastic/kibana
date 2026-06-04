/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery, escapeQuotes } from '@kbn/es-query';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
  SERVICE_ENVIRONMENT,
} from '@kbn/apm-types';

/**
 * Builds a KQL filter for `service.environment` based on the value stored on the alert.
 *
 * - `ENVIRONMENT_ALL`: no environment filter (matches everything).
 * - `ENVIRONMENT_NOT_DEFINED`: the alert fired for documents without an environment, so we
 *   exclude documents where `service.environment` exists instead of matching the literal string.
 * - any other value: match that environment exactly.
 */
export const getEnvironmentKqlFilter = (environment: unknown): string | undefined => {
  if (typeof environment !== 'string' || !environment || environment === ENVIRONMENT_ALL_VALUE) {
    return undefined;
  }

  if (environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    return `NOT ${escapeKuery(SERVICE_ENVIRONMENT)}:*`;
  }

  return `${escapeKuery(SERVICE_ENVIRONMENT)}:"${escapeQuotes(environment)}"`;
};
