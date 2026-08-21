/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartRunInput } from '../hooks/use_correlation_findings';

export type OpenOrCreateCorrelationResult = 'loaded' | 'created';

/**
 * Hub deep-link helper: open the latest run for a report when one exists,
 * otherwise start a new full-depth run.
 */
export const openOrCreateCorrelationForReport = async ({
  reportId,
  findLatestRunIdForReport,
  loadRun,
  startRun,
}: {
  reportId: string;
  findLatestRunIdForReport: (reportId: string) => Promise<string | undefined>;
  loadRun: (runId: string) => Promise<void>;
  startRun: (input: StartRunInput) => Promise<void>;
}): Promise<OpenOrCreateCorrelationResult> => {
  const existingRunId = await findLatestRunIdForReport(reportId);
  if (existingRunId) {
    await loadRun(existingRunId);
    return 'loaded';
  }
  await startRun({ input_type: 'report_id', report_id: reportId, depth: 'full' });
  return 'created';
};
