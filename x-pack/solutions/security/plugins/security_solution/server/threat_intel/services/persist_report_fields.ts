/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export interface PersistReportFieldsParams {
  index: string;
  id: string;
  doc: Record<string, unknown>;
}

/**
 * Partial-document merge onto a threat report. Internal user: `.kibana-threat-reports` is
 * plugin-owned and hidden, and Kibana feature privileges grant no Elasticsearch privileges on it,
 * so the calling user's client fails for every non-superuser. No upsert: the caller only reaches
 * this after loading the report by this same id and index, so a missing doc must fail loudly
 * rather than materialize a partial row.
 */
export const persistReportFields = async (
  esClient: ElasticsearchClient,
  { index, id, doc }: PersistReportFieldsParams
): Promise<void> => {
  await esClient.update({ index, id, doc });
};
