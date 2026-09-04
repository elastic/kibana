/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_API_ALL } from '@kbn/security-solution-features/constants';

/**
 * Read-only threat intel endpoints. `securitySolution` is the base Security API
 * privilege, held by both Security Read and Security All.
 */
export const THREAT_INTEL_READ_AUTHZ = {
  requiredPrivileges: ['securitySolution'],
};

/**
 * Endpoints that ingest reports, change source configuration, or spend model budget.
 *
 * `securitySolution` alone is not enough here: Security **Read** holds it, so a
 * read-only user could otherwise add feed sources, ingest reports, and drive
 * frontier-model calls. Promoted indicators feed Indicator Match rules, which
 * makes writing here a change to detection behavior, so this reuses
 * `RULES_API_ALL` as the closest existing "can change detection" privilege.
 *
 * This is interim. A dedicated `threat-intel-read` / `threat-intel-all`
 * sub-feature is the right long-term model and needs to be decided before the
 * `threatIntelSupplyEnabled` flag is removed.
 */
export const THREAT_INTEL_WRITE_AUTHZ = {
  requiredPrivileges: [{ allRequired: ['securitySolution', RULES_API_ALL] }],
};
