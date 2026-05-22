/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ActionableFinding, RetentionPayload, ReverseMapResult } from '@kbn/siem-readiness';
import { isRetentionNonCompliant, enrichFindings } from '@kbn/siem-readiness';
import { fetchRetention } from '../fetchers';

export const getRetention = async ({
  esClient,
  isServerless,
  logger,
  reverseMapResult,
}: {
  esClient: ElasticsearchClient;
  isServerless: boolean;
  logger: Logger;
  reverseMapResult?: ReverseMapResult;
}): Promise<RetentionPayload> => {
  const retentionResponse = await fetchRetention({ esClient, isServerless, logger });

  const actionableFindings: ActionableFinding[] = retentionResponse.items
    .filter((item) => isRetentionNonCompliant(item.status))
    .map((item) => {
      const retentionLabel = item.retentionDays ? `${item.retentionDays}d` : 'no retention policy';
      return {
        severity: 'WARNING' as const,
        message: `${item.indexName} has retention of ${retentionLabel}, below the 365-day FedRAMP threshold`,
        resource: item.indexName,
      };
    });

  const status =
    retentionResponse.items.length === 0
      ? ('noData' as const)
      : actionableFindings.length > 0
      ? ('actionsRequired' as const)
      : ('healthy' as const);

  const summary = buildRetentionSummary(
    status,
    retentionResponse.items.length,
    actionableFindings.length
  );

  const enrichedFindings = reverseMapResult
    ? enrichFindings(actionableFindings, {
        indexToRules: reverseMapResult.indexToRules,
        pipelineToIndices: reverseMapResult.pipelineToIndices,
        categoryToIndices: reverseMapResult.categoryToIndices,
        tacticTotals: reverseMapResult.tacticTotals,
        dimension: 'retention',
      })
    : actionableFindings;

  return { status, summary, items: retentionResponse.items, actionableFindings: enrichedFindings };
};

const buildRetentionSummary = (
  status: string,
  itemCount: number,
  nonCompliantCount: number
): string => {
  if (status === 'noData') return 'No data streams or indices found to evaluate retention.';
  if (nonCompliantCount > 0) {
    return `${nonCompliantCount} of ${itemCount} indices or data streams have retention below the 365-day FedRAMP threshold.`;
  }
  return `All ${itemCount} indices and data streams meet the 365-day retention requirement.`;
};
