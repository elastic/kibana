/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EngineHttpError } from './engine_http_error';

/**
 * The refusal for detection engine work in a space that is not set up. There is no fallback to the
 * caller's own privileges: a space either runs as its account or does not run.
 */
export function createNotSetUpError({
  serviceAccountsEnabled = true,
}: { serviceAccountsEnabled?: boolean } = {}): EngineHttpError {
  return new EngineHttpError(
    serviceAccountsEnabled
      ? 'Nightshift is not set up in this space. A user with the manage_security cluster privilege and the Nightshift manage privilege must ' +
        'set it up: POST /internal/nightshift/detection/service_account/_enable in this space.'
      : 'Nightshift is not set up in this space: service accounts are disabled in this deployment. ' +
        'Set xpack.security.serviceAccounts.enabled: true, then set the space up.',
    503
  );
}
