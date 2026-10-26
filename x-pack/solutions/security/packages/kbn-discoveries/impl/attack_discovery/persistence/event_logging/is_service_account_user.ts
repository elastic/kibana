/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';
import {
  CLOUD_SERVICE_ACCOUNT_REALM_TYPE,
  SERVICE_ACCOUNT_REALM_TYPE,
} from '@kbn/core-security-common';

const SERVICE_ACCOUNT_REALM_TYPES: ReadonlySet<string> = new Set([
  CLOUD_SERVICE_ACCOUNT_REALM_TYPE,
  SERVICE_ACCOUNT_REALM_TYPE,
]);

/**
 * Returns true when Elasticsearch authenticated the user through a service account realm.
 *
 * The realm is reported by Elasticsearch, so a user whose username merely looks like a service
 * account (e.g. `kibana/<name>`) is not classified as one.
 */
export const isServiceAccountUser = (user: AuthenticatedUser): boolean =>
  SERVICE_ACCOUNT_REALM_TYPES.has(user.authentication_realm?.type ?? '');
