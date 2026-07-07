/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  ActionableFinding,
  DataQualityResultDocument,
  MissingFieldsEntry,
  QualityPayload,
  ReverseMapResult,
} from '@kbn/siem-readiness';
import { getQualityVerdict, isQualityIncompatible } from '@kbn/siem-readiness';
import { fetchRuleFieldCaps } from '../fetchers';

const DATA_QUALITY_RESULTS_INDEX = '.kibana-data-quality-dashboard-results-*';

const fetchDataQualityResults = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<DataQualityResultDocument[]> => {
  try {
    const response = await esClient.search<DataQualityResultDocument>({
      index: DATA_QUALITY_RESULTS_INDEX,
      size: 10000,
      sort: [{ checkedAt: { order: 'desc' } }],
      ignore_unavailable: true,
      allow_no_indices: true,
    });

    const seen = new Set<string>();
    const results: DataQualityResultDocument[] = [];

    for (const hit of response.hits.hits) {
      if (hit._source) {
        const { indexName } = hit._source;
        if (!seen.has(indexName)) {
          seen.add(indexName);
          results.push(hit._source);
        }
      }
    }

    return results;
  } catch (error: unknown) {
    const e = error as { message?: string };
    logger.warn(`Failed to fetch data quality results: ${e.message ?? 'unknown error'}`);
    return [];
  }
};

/**
 * Build one WARNING finding per unmapped or partially-mapped required field. required_fields is an
 * informational property (it does not drive the query), so these are strong signals — not
 * guaranteed failures: fully unmapped fields may cause silent under-matching, partially unmapped
 * fields may cause partial matching.
 */
const buildMissingFieldFindings = (
  missingFieldsByRule: MissingFieldsEntry[]
): ActionableFinding[] =>
  missingFieldsByRule.flatMap((entry) =>
    entry.fields.map((fieldDetail) => {
      const message =
        fieldDetail.status === 'partial'
          ? `Rule "${entry.ruleName}" declares required field "${
              fieldDetail.name
            }" which is unmapped in some queried indices (${(fieldDetail.unmappedIn ?? []).join(
              ', '
            )}) - the rule may match only partially`
          : `Rule "${entry.ruleName}" declares required field "${fieldDetail.name}" which is not mapped in any of its queried indices - the rule may fail to match events it is meant to detect`;

      return {
        severity: 'WARNING' as const,
        type: 'missing_field' as const,
        message,
        resource: fieldDetail.name,
      };
    })
  );

/**
 * Quality orchestrator — the single source of truth shared by the agent tool and any future HTTP
 * route. It computes both quality signals so every caller sees the same result:
 * 1. ECS field compatibility (from the Data Quality dashboard results index).
 * 2. Rule required-field coverage — detection rules whose declared required_fields are not fully
 *    mapped in the indices they query (needs the rules reverse map, which is request-scoped and
 *    therefore passed in via `reverseMapResult`).
 */
export const getQuality = async ({
  esClient,
  logger,
  reverseMapResult,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  /** Rules reverse map (index → rules, rule → required fields). Built once per request by the
   * shared context and passed in, since the orchestrator cannot build it without request-scoped
   * clients. */
  reverseMapResult: ReverseMapResult;
}): Promise<QualityPayload> => {
  const { indexToRules, ruleRequiredFields, errors } = reverseMapResult;

  const [qualityResults, missingFieldsByRule] = await Promise.all([
    fetchDataQualityResults({ esClient, logger }),
    fetchRuleFieldCaps({ esClient, indexToRules, ruleRequiredFields }),
  ]);

  const ecsFindings: ActionableFinding[] = qualityResults
    .filter((result) => isQualityIncompatible(result.incompatibleFieldCount))
    .map((result) => ({
      severity: 'WARNING' as const,
      message: `${result.indexName} has ${result.incompatibleFieldCount} incompatible ECS fields`,
      resource: result.indexName,
    }));

  const missingFieldFindings = buildMissingFieldFindings(missingFieldsByRule);
  const actionableFindings = [...ecsFindings, ...missingFieldFindings];

  const { status, summary } = getQualityVerdict({
    checkedCount: qualityResults.length,
    incompatibleCount: ecsFindings.length,
    missingFieldCount: missingFieldsByRule.length,
    rulesPartial: errors.rulesPartial,
  });

  return { status, summary, items: qualityResults, actionableFindings, missingFieldsByRule };
};
