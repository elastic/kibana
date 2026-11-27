/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Body of `POST /internal/nightshift/detection/service_account/_enable`. */
export interface DetectionEngineEnableBody {
  /**
   * The id of the deployment's `nightshift_detection` account, as the service accounts backend
   * assigned it. The caller finds or creates the account first, with
   * `ensureNightshiftServiceAccount`.
   */
  serviceAccountId: string;
}

/** Response of `POST /internal/nightshift/detection/service_account/_enable`. */
export interface DetectionEngineEnableResponse extends DetectionEngineEnableBody {
  /** The space that was set up. */
  spaceId: string;
}

/** What `GET /internal/nightshift/detection/service_account` reports for the current space. */
export interface DetectionEngineServiceAccountStatus {
  /** Whether the deployment has service accounts at all (`xpack.security.serviceAccounts.enabled`). */
  serviceAccountsEnabled: boolean;
  /** Whether the current user may call `_enable`: `manage_security` and the Nightshift manage privilege. */
  canSetUp: boolean;
  /** The role the account must hold. The engine only checks it, it never creates it. */
  role: string;
  /** The account the space's detection engine runs as, or `null` when the space is not set up. */
  serviceAccountId: string | null;
}
