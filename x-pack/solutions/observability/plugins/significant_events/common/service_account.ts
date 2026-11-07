/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Body of `POST /internal/significant_events/service_account/_enable`. */
export interface DetectionEngineEnableBody {
  /**
   * The id of the deployment's `nightshift_detection` account, as the service accounts backend
   * assigned it. The caller finds or creates the account first, with `ensureNightshiftServiceAccount`.
   */
  serviceAccountId: string;
}

/** What `GET /internal/significant_events/service_account` reports for the current space. */
export interface DetectionEngineServiceAccountStatus {
  /** Whether the deployment has service accounts at all (`xpack.security.serviceAccounts.enabled`). */
  serviceAccountsEnabled: boolean;
  /** Whether the current user may set the space up, which needs `manage_security`. */
  canSetUp: boolean;
  /** The role the account must hold. Nightshift only checks it, it never creates it. */
  role: string;
  /** The account the space's detection engine runs as, or `null` when the space is not set up. */
  serviceAccountId: string | null;
}
