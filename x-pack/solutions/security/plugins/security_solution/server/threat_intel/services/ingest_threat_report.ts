/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { THREAT_REPORTS_INDEX } from '../../../common/threat_intel';

export interface IngestThreatReportResult {
  reportId: string;
}

/**
 * Writes one fetched-feed report as a new document. Internal user: `.kibana-threat-reports` is
 * plugin-owned and hidden, and Kibana feature privileges grant no Elasticsearch privileges on it,
 * so the calling user's client fails for every non-superuser. `op_type: create` with no explicit
 * id (Elasticsearch mints one) rather than an upsert, since there is nothing to upsert against --
 * dedup by `content_fingerprint` is the caller's own `check_dedup` step, not this write.
 */
export const ingestThreatReport = async (
  esClient: ElasticsearchClient,
  document: Record<string, unknown>
): Promise<IngestThreatReportResult> => {
  const result = await esClient.index({
    index: THREAT_REPORTS_INDEX,
    op_type: 'create',
    document,
  });
  return { reportId: result._id };
};
