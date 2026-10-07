/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { THREAT_REPORTS_INDEX } from '../../../../common/threat_intel';

/** Minimal ES client surface these tests rely on. */
interface EsLike {
  deleteByQuery(args: {
    index: string;
    query: Record<string, unknown>;
    refresh?: boolean;
    ignore_unavailable?: boolean;
    conflicts?: 'proceed' | 'abort';
  }): Promise<unknown>;
}

/**
 * Security read-only role: holds the base `securitySolution` API privilege via
 * `siem: ['read']` but NOT `RULES_API_ALL`. This is the exact boundary
 * `THREAT_INTEL_WRITE_AUTHZ` documents, so it proves a read-only Security user
 * cannot mutate the source catalog.
 *
 * The threat intel routes read and write their hidden indices as the internal
 * user, so this role needs no Elasticsearch index privileges of its own.
 */
export const SECURITY_READ_ONLY_ROLE = {
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

/**
 * Remove only the specific threat reports created by this suite run.
 * Scoped to IDs (not adapter_id) so parallel runs or real users on a shared
 * cluster are not affected.
 */
export const cleanupThreatReportsByIds = async (esClient: EsLike, ids: string[]) => {
  if (ids.length === 0) return;
  await esClient.deleteByQuery({
    index: THREAT_REPORTS_INDEX,
    query: { ids: { values: ids } },
    refresh: true,
    ignore_unavailable: true,
    conflicts: 'proceed',
  });
};
