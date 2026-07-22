/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { THREAT_INTEL_HUNT_FINDINGS_INDEX } from '../../../common/threat_intelligence/hub';
import { buildSpaceFilterTerms } from '../lib/space_filter';

export interface MarkHuntFindingDeployedParams {
  spaceId: string;
  findingId: string;
  ruleId: string;
  deployedAt?: string;
}

export interface MarkHuntFindingDeployedResult {
  finding_id: string;
  status: 'deployed';
  deployed_rule_id: string;
  deployed_at: string;
}

export class HuntFindingNotFoundError extends Error {
  constructor(findingId: string) {
    super(`Hunt finding not found: ${findingId}`);
    this.name = 'HuntFindingNotFoundError';
  }
}

/**
 * Persist Detection Engine rule linkage onto a durable hunt finding row.
 * Space-scoped: only findings visible in the current space (or GLOBAL) can be updated.
 */
export const markHuntFindingDeployed = async (
  esClient: ElasticsearchClient,
  params: MarkHuntFindingDeployedParams
): Promise<MarkHuntFindingDeployedResult> => {
  const deployedAt = params.deployedAt ?? new Date().toISOString();

  const existing = await esClient.search({
    index: THREAT_INTEL_HUNT_FINDINGS_INDEX,
    ignore_unavailable: true,
    size: 1,
    query: {
      bool: {
        filter: [{ ids: { values: [params.findingId] } }, buildSpaceFilterTerms(params.spaceId)],
      },
    },
    _source: false,
  });

  if (existing.hits.hits.length === 0) {
    throw new HuntFindingNotFoundError(params.findingId);
  }

  await esClient.update({
    index: THREAT_INTEL_HUNT_FINDINGS_INDEX,
    id: params.findingId,
    doc: {
      status: 'deployed',
      deployed_rule_id: params.ruleId,
      deployed_at: deployedAt,
    },
    refresh: true,
  });

  return {
    finding_id: params.findingId,
    status: 'deployed',
    deployed_rule_id: params.ruleId,
    deployed_at: deployedAt,
  };
};
