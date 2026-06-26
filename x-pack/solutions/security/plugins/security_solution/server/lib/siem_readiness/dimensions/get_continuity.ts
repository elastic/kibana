/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ActionableFinding, ContinuityPayload } from '@kbn/siem-readiness';
import { isCriticalFailureRate } from '@kbn/siem-readiness';
import { fetchPipelines } from '../fetchers';

export const getContinuity = async ({
  esClient,
  isServerless,
  logger,
}: {
  esClient: ElasticsearchClient;
  isServerless: boolean;
  logger: Logger;
}): Promise<ContinuityPayload> => {
  const pipelines = await fetchPipelines({ esClient, isServerless, logger });

  const actionableFindings: ActionableFinding[] = pipelines
    .filter((p) => p.statsAvailable && isCriticalFailureRate(p.failedDocsCount, p.docsCount))
    .map((p) => ({
      severity: 'CRITICAL' as const,
      message: `Pipeline ${p.name} has a critical document failure rate (${p.failedDocsCount} of ${p.docsCount} failed)`,
      resource: p.name,
    }));

  const status =
    pipelines.length === 0
      ? ('noData' as const)
      : actionableFindings.length > 0
      ? ('actionsRequired' as const)
      : ('healthy' as const);

  const summary = buildContinuitySummary(status, pipelines.length, actionableFindings.length);

  return { status, summary, items: pipelines, actionableFindings };
};

const buildContinuitySummary = (
  status: string,
  pipelineCount: number,
  criticalCount: number
): string => {
  if (status === 'noData') return 'No active ingest pipelines found.';
  if (criticalCount > 0) {
    return `${criticalCount} of ${pipelineCount} pipelines have critical failure rates and require immediate attention.`;
  }
  return `All ${pipelineCount} active ingest pipelines are healthy.`;
};
