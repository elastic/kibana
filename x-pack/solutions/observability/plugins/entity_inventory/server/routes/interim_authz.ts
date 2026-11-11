/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';

/**
 * The authorization every entity inventory route declares: Kibana checks none, and the
 * request-scoped Elasticsearch client enforces index privileges on every query.
 */
// TODO(elastic/observability-dev#6244): replace with the inventory's privilege model.
export const INTERIM_AUTHZ = {
  authz: AuthzDisabled.delegateToESClient,
} satisfies RouteSecurity;
