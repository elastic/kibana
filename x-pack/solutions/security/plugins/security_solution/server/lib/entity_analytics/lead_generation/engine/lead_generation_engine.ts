/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import type {
  Lead,
  LeadEntity,
  LeadGenerationEngineConfig,
  Observation,
  ObservationModule,
  ScoredEntity,
} from '../types';
import { computeStaleness, DEFAULT_ENGINE_CONFIG } from '../types';
import { llmSynthesizeBatch, type CohortContext } from './llm_synthesize';

interface LeadGenerationEngineDeps {
  readonly logger: Logger;
  readonly config?: Partial<LeadGenerationEngineConfig>;
}

export interface LeadCandidate extends ScoredEntity {
  readonly leadId: string;
}

export const createLeadGenerationEngine = ({
  logger,
  config: configOverrides,
}: LeadGenerationEngineDeps) => {
  const config: LeadGenerationEngineConfig = {
    ...DEFAULT_ENGINE_CONFIG,
    ...configOverrides,
  };
  const modules: ObservationModule[] = [];

  const prepareLeadCandidates = async (
    entities: LeadEntity[]
  ): Promise<{ confident: LeadCandidate[]; exploratory: LeadCandidate[] }> => {
    const pipelineStart = Date.now();
    const empty = { confident: [], exploratory: [] };

    if (entities.length === 0) {
      return empty;
    }

    // 1. Collect observations from all enabled modules
    const collectStart = Date.now();
    const observations = await collectAllObservations(modules, entities, logger);
    const collectMs = Date.now() - collectStart;
    logger.debug(
      `[LeadGenerationEngine] Observation collection: ${collectMs}ms (${observations.length} observations from ${modules.length} modules)`
    );

    if (observations.length === 0) {
      logger.debug('[LeadGenerationEngine] No observations collected - no leads to generate');
      return empty;
    }

    // 2. Score entities based on their observations
    const scoreStart = Date.now();
    const moduleWeights = new Map<string, number>(
      modules.map((m) => {
        const cfg = m.config as typeof m.config & { readonly weight?: number };
        return [m.config.id, cfg.weight ?? 1.0];
      })
    );
    const scoredEntities = scoreEntities(observations, entities, config, moduleWeights);
    const scoreMs = Date.now() - scoreStart;
    logger.debug(
      `[LeadGenerationEngine] Entity scoring: ${scoreMs}ms (${scoredEntities.length} entities scored)`
    );

    // 3. Filter entities below threshold
    const qualifyingEntities = scoredEntities.filter(
      (e) => e.observations.length >= config.minObservations
    );

    if (qualifyingEntities.length === 0) {
      logger.debug('[LeadGenerationEngine] No entities met the threshold - no leads to generate');
      return empty;
    }

    // 4. Format lead candidates. Relationships aren't resolved here — the
    // pipeline fills topRelatedEntities/relatedEntityCounts in afterwards via
    // `attachRelatedEntities`.
    const toCandidate = (scored: (typeof qualifyingEntities)[number]): LeadCandidate => ({
      entity: scored.entity,
      priority: scored.priority,
      observations: scored.observations,
      leadId: hashEuid(scored.entity.id),
      topRelatedEntities: [],
      relatedEntityCounts: {},
    });

    // 'confident' is the pool of best scored entities (up to maxLeads) that will be used to generate leads
    const confident = qualifyingEntities.slice(0, config.maxLeads).map(toCandidate);
    // 'exploratory' is the pool of entities that did not make the cut (still have minObservations) but will be considered for exploratory leads
    const exploratory = qualifyingEntities.slice(config.maxLeads).map(toCandidate);

    logger.debug(
      `[LeadGenerationEngine] Prepared ${confident.length} confident + ${
        exploratory.length
      } exploratory candidates in ${
        Date.now() - pipelineStart
      }ms (collection=${collectMs}ms, scoring=${scoreMs}ms)`
    );

    return { confident, exploratory };
  };

  const synthesizeLeads = async (
    candidates: LeadCandidate[],
    options: { chatModel: InferenceChatModel }
  ): Promise<Lead[]> => {
    if (candidates.length === 0) {
      return [];
    }
    return groupIntoLeads(candidates, logger, options.chatModel);
  };

  return {
    /**
     * Register an observation module with the engine.
     */
    registerModule(module: ObservationModule): void {
      modules.push(module);
      modules.sort((a, b) => b.config.priority - a.config.priority);
      logger.debug(
        `[LeadGenerationEngine] Registered module "${module.config.name}" (priority=${module.config.priority})`
      );
    },
    prepareLeadCandidates,
    synthesizeLeads,
  };
};

const collectAllObservations = async (
  modules: ObservationModule[],
  entities: LeadEntity[],
  logger: Logger
): Promise<Observation[]> => {
  const allObservations: Observation[] = [];

  for (const module of modules) {
    if (module.isEnabled()) {
      try {
        const moduleStart = Date.now();
        const moduleObservations = await module.collect(entities);
        const moduleMs = Date.now() - moduleStart;
        logger.debug(
          `[LeadGenerationEngine] Module "${module.config.name}": ${moduleMs}ms (${moduleObservations.length} observations from ${entities.length} entities)`
        );
        allObservations.push(...moduleObservations);
      } catch (error) {
        logger.error(`[LeadGenerationEngine] Module "${module.config.name}" failed: ${error}`);
      }
    } else {
      logger.debug(`[LeadGenerationEngine] Skipping disabled module "${module.config.name}"`);
    }
  }

  return allObservations;
};

/**
 * Entity scoring — weighted formula
 *
 * Contribution per observation:
 *   module_weight × observation.score × observation.confidence
 *
 * Bonuses (multiplicative):
 *   Corroboration: +corroborationBonus when multiple observations share a module
 *   Diversity:     +diversityBonus when observations span multiple modules
 *
 * Normalization:
 *   priority = round(rawScore / normalizationCeiling × 9 + 1), clamped to [1, 10]
 */
const groupObservationsByEntity = (
  observations: readonly Observation[]
): ReadonlyMap<string, Observation[]> =>
  observations.reduce((acc, obs) => {
    const existing = acc.get(obs.entityId) ?? [];
    acc.set(obs.entityId, [...existing, obs]);
    return acc;
  }, new Map<string, Observation[]>());

const scoreEntities = (
  observations: Observation[],
  allEntities: LeadEntity[],
  config: LeadGenerationEngineConfig,
  moduleWeights: ReadonlyMap<string, number>
): Omit<ScoredEntity, 'topRelatedEntities' | 'relatedEntityCounts'>[] => {
  const entityByKey = new Map(allEntities.map((e) => [e.id, e]));
  const observationsByEntity = groupObservationsByEntity(observations);

  return [...observationsByEntity.entries()]
    .flatMap(([entityId, entityObservations]) => {
      const entity = entityByKey.get(entityId);
      if (!entity) return [];
      const priority = calculateWeightedPriority(entityObservations, moduleWeights, config);
      return [{ entity, priority, observations: entityObservations }];
    })
    .sort((a, b) => b.priority - a.priority);
};

/**
 * Weighted scoring with corroboration and diversity bonuses.
 *
 * Falls back to weight=1.0 for observations from unregistered modules so the
 * pipeline degrades gracefully when a module is added without engine wiring.
 */
interface ScoreAccumulation {
  readonly rawScore: number;
  readonly countByModule: ReadonlyMap<string, number>;
}

const accumulateRawScore = (
  observations: readonly Observation[],
  moduleWeights: ReadonlyMap<string, number>
): ScoreAccumulation =>
  observations.reduce<ScoreAccumulation>(
    (acc, obs) => {
      const weight = moduleWeights.get(obs.moduleId) ?? 1.0;
      return {
        rawScore: acc.rawScore + weight * obs.score * obs.confidence,
        countByModule: new Map([
          ...acc.countByModule,
          [obs.moduleId, (acc.countByModule.get(obs.moduleId) ?? 0) + 1],
        ]),
      };
    },
    { rawScore: 0, countByModule: new Map() }
  );

const applyBonuses = (
  { rawScore, countByModule }: ScoreAccumulation,
  config: LeadGenerationEngineConfig
): number => {
  const hasCorroboration = [...countByModule.values()].some((count) => count > 1);
  const hasDiversity = countByModule.size > 1;

  let adjusted = rawScore;
  if (hasCorroboration) adjusted *= 1 + config.corroborationBonus;
  if (hasDiversity) adjusted *= 1 + config.diversityBonus;
  return adjusted;
};

const normalizePriority = (adjustedScore: number, ceiling: number): number =>
  Math.max(1, Math.min(10, Math.round((adjustedScore / ceiling) * 9 + 1)));

const calculateWeightedPriority = (
  observations: Observation[],
  moduleWeights: ReadonlyMap<string, number>,
  config: LeadGenerationEngineConfig
): number => {
  if (observations.length === 0) return 1;

  const accumulated = accumulateRawScore(observations, moduleWeights);
  const adjusted = applyBonuses(accumulated, config);
  return normalizePriority(adjusted, config.normalizationCeiling);
};

const groupIntoLeads = async (
  candidates: ReadonlyArray<ScoredEntity>,
  logger: Logger,
  chatModel: InferenceChatModel
): Promise<Lead[]> => {
  const now = new Date();
  const cohort = computeCohortContext(candidates);

  const synthStart = Date.now();
  const llmResults = await llmSynthesizeBatch(chatModel, candidates, logger, cohort);
  logger.debug(
    `[LeadGenerationEngine] LLM synthesis: ${Date.now() - synthStart}ms (${
      candidates.length
    } leads)`
  );

  return candidates.map((candidate, i) => {
    const { entity, priority, observations, topRelatedEntities, relatedEntityCounts } = candidate;
    const llm = llmResults[i];

    return {
      id: hashEuid(entity.id),
      title: llm.title,
      byline: llm.byline?.trim() ? llm.byline : buildByline(candidate),
      description: llm.description,
      entity,
      tags: llm.tags,
      priority,
      chatRecommendations: llm.recommendations,
      timestamp: now.toISOString(),
      staleness: computeStaleness(now, now),
      observations,
      topRelatedEntities,
      relatedEntityCounts,
      origin: candidate.origin ?? 'observations',
    };
  });
};

/**
 * Aggregates cross-entity ("peer") context across the batch so a single lead's
 * narrative can convey scope — e.g. how many other candidate entities exhibit
 * the same observation type. Each entity is counted once per observation type.
 */
export const computeCohortContext = (candidates: ReadonlyArray<ScoredEntity>): CohortContext => {
  const entityCountByObservationType: Record<string, number> = {};

  for (const candidate of candidates) {
    const typesForEntity = new Set(candidate.observations.map((o) => o.type));
    for (const type of typesForEntity) {
      entityCountByObservationType[type] = (entityCountByObservationType[type] ?? 0) + 1;
    }
  }

  return { totalCandidates: candidates.length, entityCountByObservationType };
};

const buildByline = (candidate: ScoredEntity): string => {
  const { entity, observations } = candidate;

  const totalAlerts = extractNumber(observations, 'total_alerts');
  const distinctRules =
    extractNumber(observations, 'distinct_rules') ||
    extractNumber(observations, 'distinct_rule_count');
  const riskScore = extractNumber(observations, 'calculated_score_norm');

  const parts: string[] = [];
  if (riskScore > 0) {
    parts.push(`risk score ${riskScore.toFixed(1)}`);
  }
  if (totalAlerts > 0) {
    parts.push(`${totalAlerts} alerts`);
  }
  if (distinctRules > 0) {
    parts.push(`${distinctRules} detection rules`);
  }

  if (parts.length > 0) {
    return `${capitalize(entity.type)} ${entity.name} with ${parts.join(', ')} in the last 7 days.`;
  }
  return `${capitalize(entity.type)} ${entity.name} with ${
    observations.length
  } observations in the last 7 days.`;
};

const extractNumber = (observations: Observation[], key: string): number => {
  for (const obs of observations) {
    const val = obs.metadata[key];
    if (val !== undefined && val !== null) {
      return Number(val) || 0;
    }
  }
  return 0;
};

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
