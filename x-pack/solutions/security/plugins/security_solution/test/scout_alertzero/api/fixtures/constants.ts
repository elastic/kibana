/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_API_HEADERS, type KibanaRole } from '@kbn/scout-security';
import {
  ALERTZERO_WORKERS_URL,
  buildWorkerUrl,
  CANDIDATES_URL,
  FIND_OR_CREATE_INVESTIGATION_URL,
  HUNT_COORDINATOR_URL,
  HUNT_INDEX_SCOPE_URL,
  HUNT_THREAT_INTEL_SUPPLY_RESTORE_URL,
  HUNT_THREAT_INTEL_SUPPLY_URL,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  WRITE_HUNT_EVIDENCE_URL,
} from '@kbn/alertzero-common';

/**
 * Threat intel routes are all `access: 'internal'` at version 1, so every
 * request needs the internal-origin header plus `elastic-api-version: 1`.
 * `kbn-xsrf` is additionally required for the mutating routes.
 */
export const TI_HEADERS = {
  ...INTERNAL_API_HEADERS,
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
};

/** Same headers Hunt and Worker internal routes accept. */
export const HUNT_HEADERS = TI_HEADERS;

/** Hunt for_threat and hunt_behavior live beside the other hunt URLs; not yet in the common package. */
export const HUNT_FOR_THREAT_URL = '/internal/alertzero/hunt/hunt_for_threat' as const;
export const HUNT_BEHAVIOR_URL = '/internal/alertzero/hunt/hunt_behavior' as const;

export const HUNT_WORKER_ID = SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID;
export const HUNT_WORKER_URL = buildWorkerUrl(HUNT_WORKER_ID);
export const WORKERS_URL = ALERTZERO_WORKERS_URL;
export const SUPPLY_STATUS_URL = HUNT_THREAT_INTEL_SUPPLY_URL;
export const SUPPLY_RESTORE_URL = HUNT_THREAT_INTEL_SUPPLY_RESTORE_URL;

/** The seven hunt internal routes Phase 1 named in the authz table. */
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
 * Security read only, no AlertZero feature. Same privilege boundary as
 * {@link SECURITY_READ_ONLY_ROLE} in helpers; named here for the authz table.
 */
export const NO_ALERTZERO_ROLE: KibanaRole = {
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
