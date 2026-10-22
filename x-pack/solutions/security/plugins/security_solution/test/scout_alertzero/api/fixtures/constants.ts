/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_API_HEADERS, type KibanaRole } from '@kbn/scout-security';
import {
  buildWorkerUrl,
  CANDIDATES_URL,
  FIND_OR_CREATE_INVESTIGATION_URL,
  HUNT_COORDINATOR_URL,
  HUNT_INDEX_SCOPE_URL,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  WRITE_HUNT_EVIDENCE_URL,
} from '@kbn/alertzero-common';

/**
 * Threat intel, Hunt, and Worker routes are all `access: 'internal'` at version 1, so
 * every request needs the internal-origin header plus `elastic-api-version: 1`.
 * `kbn-xsrf` is additionally required for the mutating routes.
 */
export const TI_HEADERS = {
  ...INTERNAL_API_HEADERS,
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
};

/** Hunt for_threat and hunt_behavior live beside the other hunt URLs; not yet in the common package. */
export const HUNT_FOR_THREAT_URL = '/internal/alertzero/hunt/hunt_for_threat' as const;
export const HUNT_BEHAVIOR_URL = '/internal/alertzero/hunt/hunt_behavior' as const;

export const HUNT_WORKER_URL = buildWorkerUrl(
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
);

/** The seven hunt internal routes covered by the authz table. */
export const HUNT_READ_ROUTES = [
  HUNT_INDEX_SCOPE_URL,
  CANDIDATES_URL,
  HUNT_FOR_THREAT_URL,
] as const;

export const HUNT_WRITE_ROUTES = [
  HUNT_COORDINATOR_URL,
  HUNT_BEHAVIOR_URL,
  FIND_OR_CREATE_INVESTIGATION_URL,
  WRITE_HUNT_EVIDENCE_URL,
] as const;

export const HUNT_ALL_ROUTES = [...HUNT_READ_ROUTES, ...HUNT_WRITE_ROUTES] as const;

/**
 * AlertZero read-only: Security read plus AlertZero read, no cluster privileges.
 * Sees supply status (including `inUseElsewhere`) but cannot Restore or PATCH Workers.
 */
export const ALERTZERO_READ_ONLY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [],
  },
  kibana: [
    {
      base: [],
      feature: { siem: ['read'], alertzero: ['read'] },
      spaces: ['*'],
    },
  ],
};

/**
 * Security read only, no AlertZero feature: holds the base `securitySolution` API
 * privilege via `siem: ['read']` but not `RULES_API_ALL`, the boundary
 * `THREAT_INTEL_WRITE_AUTHZ` documents, so a read-only Security user cannot mutate
 * the source catalog and gets 403 on every hunt route.
 *
 * The threat intel routes read and write their hidden indices as the internal
 * user, so this role needs no Elasticsearch index privileges of its own.
 */
export const SECURITY_READ_ONLY_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [],
  },
  kibana: [
    {
      base: [],
      feature: { siem: ['read'] },
      spaces: ['*'],
    },
  ],
};
