/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest } from '@kbn/core/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import { CaseStatuses } from '@kbn/cases-components';
import type {
  ExtractedEntity,
  CaseMatchScore,
  CaseMatchingConfig,
  ObservableTypeKey,
} from '../types';
import { CaseEntityIndex } from './entity_index';

interface CaseWithObservables {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly updatedAt: string;
  readonly observables: Array<{
    readonly typeKey: string;
    readonly value: string;
  }>;
}

export interface CaseMatchResult {
  readonly alertId: string;
  readonly entities: ExtractedEntity[];
  readonly matchedCase: CaseMatchScore | null;
  readonly allScores: CaseMatchScore[];
}

export interface CaseMatchingResult {
  readonly matched: CaseMatchResult[];
  readonly unmatched: CaseMatchResult[];
  readonly stats: {
    readonly alertsProcessed: number;
    readonly alertsMatched: number;
    readonly alertsUnmatched: number;
    readonly casesEvaluated: number;
    readonly avgMatchScore: number;
  };
}

const getEntityWeight = (
  typeKey: ObservableTypeKey,
  weights: CaseMatchingConfig['weights']
): number => {
  switch (typeKey) {
    case 'ipv4':
    case 'ipv6':
      return weights.ip;
    case 'hostname':
      return weights.hostname;
    case 'user':
      return weights.user;
    case 'file_hash':
      return weights.fileHash;
    case 'domain':
      return weights.domain;
    case 'process':
      return weights.process;
    default:
      return weights.other;
  }
};

const computeTemporalDecay = (updatedAt: string, decayDays: number): number => {
  const daysSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0.1, 1.0 - daysSinceUpdate / decayDays);
};

const CASES_TO_PIPELINE_TYPE_KEY: Record<string, ObservableTypeKey> = {
  'observable-type-ipv4': 'ipv4',
  'observable-type-ipv6': 'ipv6',
  'observable-type-url': 'url',
  'observable-type-hostname': 'hostname',
  'observable-type-file-hash': 'file_hash',
  'observable-type-file-path': 'file_path',
  'observable-type-email': 'email',
  'observable-type-domain': 'domain',
  'observable-type-agent-id': 'agent_id',
  'observable-type-user': 'user',
  'observable-type-process': 'process',
  'observable-type-registry': 'registry',
  'observable-type-service': 'service',
};

const normalizeCasesTypeKey = (casesKey: string): string =>
  CASES_TO_PIPELINE_TYPE_KEY[casesKey] ?? casesKey;

const scoreEntityOverlap = ({
  alertEntities,
  caseObservables,
  config,
  caseUpdatedAt,
}: {
  alertEntities: ExtractedEntity[];
  caseObservables: Array<{ typeKey: string; value: string }>;
  config: CaseMatchingConfig;
  caseUpdatedAt: string;
}): { score: number; matchedEntities: Array<{ typeKey: ObservableTypeKey; value: string }> } => {
  const caseObsSet = new Map<string, string>();
  for (const obs of caseObservables) {
    const normalizedKey = normalizeCasesTypeKey(obs.typeKey);
    caseObsSet.set(`${normalizedKey}::${obs.value.toLowerCase()}`, normalizedKey);
  }

  const matchedEntities: Array<{ typeKey: ObservableTypeKey; value: string }> = [];
  let weightedScore = 0;
  let maxPossibleScore = 0;

  for (const entity of alertEntities) {
    const weight = getEntityWeight(entity.typeKey, config.weights);
    maxPossibleScore += weight;

    const key = `${entity.typeKey}::${entity.value.toLowerCase()}`;
    if (caseObsSet.has(key)) {
      weightedScore += weight;
      matchedEntities.push({ typeKey: entity.typeKey, value: entity.value });
    }
  }

  if (maxPossibleScore === 0) {
    return { score: 0, matchedEntities: [] };
  }

  let score = weightedScore / maxPossibleScore;

  if (config.strategy === 'temporal') {
    const decay = computeTemporalDecay(caseUpdatedAt, config.temporalDecayDays);
    score *= decay;
  }

  return { score, matchedEntities };
};

/**
 * Fetches all open cases with their observables for matching.
 */
const fetchOpenCasesWithObservables = async ({
  cases,
  request,
  logger,
}: {
  cases: CasesServerStart;
  request: KibanaRequest;
  logger: Logger;
}): Promise<CaseWithObservables[]> => {
  const casesClient = await cases.getCasesClientWithRequest(request);

  const result = await casesClient.cases.find({
    status: CaseStatuses.open,
    sortField: 'updatedAt',
    sortOrder: 'desc',
    perPage: 100,
  });

  if (result.total > result.cases.length) {
    logger.warn(
      `Case matching is limited to the ${result.cases.length} most recently updated open cases out of ${result.total} total. Older cases may not be matched.`
    );
  }

  const casesWithObs: CaseWithObservables[] = [];

  for (const caseItem of result.cases) {
    casesWithObs.push({
      id: caseItem.id,
      title: caseItem.title,
      status: caseItem.status,
      updatedAt: caseItem.updated_at ?? caseItem.created_at,
      observables: (caseItem.observables ?? []).map((obs) => ({
        typeKey: obs.typeKey,
        value: obs.value,
      })),
    });
  }

  logger.debug(
    () =>
      `fetchOpenCasesWithObservables: fetched ${casesWithObs.length} open cases, ${
        casesWithObs.filter((c) => c.observables.length > 0).length
      } with observables`
  );

  return casesWithObs;
};

/**
 * Groups alert entities by alert ID for per-alert matching.
 */
const groupEntitiesByAlert = (entities: ExtractedEntity[]): Map<string, ExtractedEntity[]> => {
  const grouped = new Map<string, ExtractedEntity[]>();
  for (const entity of entities) {
    const existing = grouped.get(entity.alertId);
    if (existing) {
      existing.push(entity);
    } else {
      grouped.set(entity.alertId, [entity]);
    }
  }
  return grouped;
};

/**
 * Matches extracted entities against open cases using configurable scoring.
 */
export const matchAlertsToCases = async ({
  entities,
  cases,
  config,
  logger,
  request,
}: {
  entities: ExtractedEntity[];
  cases: CasesServerStart;
  config: CaseMatchingConfig;
  logger: Logger;
  request: KibanaRequest;
}): Promise<CaseMatchingResult> => {
  const openCases = await fetchOpenCasesWithObservables({ cases, request, logger });

  // Build inverted index: entity → case_ids (O(m*k) - once per pipeline run)
  const caseIndex = new CaseEntityIndex(openCases, normalizeCasesTypeKey);
  const indexStats = caseIndex.getStats();

  logger.debug(
    () =>
      `Built case entity index: ${indexStats.totalCases} cases, ` +
      `${indexStats.totalUniqueEntities} unique entities, ` +
      `avg ${indexStats.avgEntitiesPerCase.toFixed(1)} entities/case`
  );

  const alertEntityGroups = groupEntitiesByAlert(entities);
  const matched: CaseMatchResult[] = [];
  const unmatched: CaseMatchResult[] = [];
  let totalScore = 0;
  let totalCandidatesEvaluated = 0;

  // Match alerts using index (O(n*k) instead of O(n*m*k))
  for (const [alertId, alertEntities] of alertEntityGroups) {
    // Find candidate cases (only cases sharing at least one entity)
    const candidateCaseIds = caseIndex.findCandidateCases(alertEntities);
    totalCandidatesEvaluated += candidateCaseIds.size;

    // Score only candidates (not all 100 cases!)
    const allScores: CaseMatchScore[] = [];

    for (const caseId of candidateCaseIds) {
      const openCase = caseIndex.getCaseById(caseId);
      if (!openCase) continue; // Should never happen

      const { score, matchedEntities } = scoreEntityOverlap({
        alertEntities,
        caseObservables: openCase.observables,
        config,
        caseUpdatedAt: openCase.updatedAt,
      });

      if (score > 0) {
        allScores.push({
          caseId: openCase.id,
          caseTitle: openCase.title,
          score,
          matchedEntities,
          caseUpdatedAt: openCase.updatedAt,
        });
      }
    }

    allScores.sort((a, b) => b.score - a.score);

    const bestMatch =
      allScores.length > 0 && allScores[0].score >= config.matchThreshold ? allScores[0] : null;

    const result: CaseMatchResult = {
      alertId,
      entities: alertEntities,
      matchedCase: bestMatch,
      allScores,
    };

    if (bestMatch) {
      matched.push(result);
      totalScore += bestMatch.score;
    } else {
      unmatched.push(result);
    }
  }

  const avgCandidatesPerAlert =
    alertEntityGroups.size > 0 ? totalCandidatesEvaluated / alertEntityGroups.size : 0;

  logger.info(
    `matchAlertsToCases: ${matched.length} matched, ${unmatched.length} unmatched. ` +
      `Evaluated avg ${avgCandidatesPerAlert.toFixed(1)} candidate cases/alert ` +
      `(vs ${indexStats.totalCases} total - ${Math.round((1 - avgCandidatesPerAlert / indexStats.totalCases) * 100)}% reduction via index)`
  );

  return {
    matched,
    unmatched,
    stats: {
      alertsProcessed: alertEntityGroups.size,
      alertsMatched: matched.length,
      alertsUnmatched: unmatched.length,
      casesEvaluated: openCases.length,
      avgMatchScore: matched.length > 0 ? totalScore / matched.length : 0,
    },
  };
};
