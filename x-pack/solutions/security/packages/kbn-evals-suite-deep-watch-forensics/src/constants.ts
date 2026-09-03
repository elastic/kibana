/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Managed Forensics Watch id used on the PND watches route (no suffix; the
 * canonical id keeps its historical `deep` slug per D25).
 */
export const DEEP_WATCH_WATCH_ID = 'system-security-watch-deep';
/**
 * Installed workflow SO id used to run the watch: watch id + `-default` suffix.
 * Installation is lazy -- the SO only exists after the watch is first enabled.
 */
export const DEEP_WATCH_WORKFLOW_ID = 'system-security-watch-deep-default';
/** Public workflows_management API version (`Elastic-Api-Version` header). */
export const WORKFLOWS_API_VERSION = '2023-10-31';
/** Internal PND watches route, used to enable the managed watch. */
export const PND_WATCHES_ROUTE = '/internal/pnd/watches';
/** Internal PND API version. */
export const PND_API_VERSION = '1';
/** Attack Discovery alerts index the golden rows are seeded into. */
export const ATTACK_DISCOVERY_INDEX =
  '.internal.alerts-security.attack.discovery.alerts-default-000001';
