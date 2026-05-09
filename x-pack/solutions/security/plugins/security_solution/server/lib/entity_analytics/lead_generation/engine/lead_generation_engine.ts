/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type {
  Lead,
  LeadEntity,
  LeadGenerationEngineConfig,
  Observation,
  ObservationModule,
} from '../types';
import { computeStaleness, DEFAULT_ENGINE_CONFIG } from '../types';
import { entityToKey } from '../observation_modules/utils';
import { llmSynthesizeBatch } from './llm_synthesize';

interface LeadGenerationEngineDeps {
  readonly logger: Logger;
  readonly config?: Partial<LeadGenerationEngineConfig>;
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

    /**
     * Run all enabled modules against the given entities and produce leads.
     */
    async generateLeads(
      entities: LeadEntity[],
      options: { chatModel: InferenceChatModel }
    ): Promise<Lead[]> {
      const pipelineStart = Date.now();

      if (entities.length === 0) {
        return [];
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
        return [];
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

      // 3. Filter entities below threshold and cap to maxLeads before synthesis
      const qualifyingEntities = scoredEntities
        .filter((e) => e.observations.length >= config.minObservations)
        .slice(0, config.maxLeads);

      if (qualifyingEntities.length === 0) {
        logger.debug('[LeadGenerationEngine] No entities met the threshold - no leads to generate');
        return [];
      }

      // 4. Group related entities into leads and synthesize content in a single LLM call
      const groupStart = Date.now();
      const leads = await groupIntoLeads(qualifyingEntities, config, logger, options.chatModel);
      const groupMs = Date.now() - groupStart;
      logger.debug(
        `[LeadGenerationEngine] Lead grouping & synthesis: ${groupMs}ms (${leads.length} leads)`
      );

      const totalMs = Date.now() - pipelineStart;
      logger.debug(
        `[LeadGenerationEngine] Total pipeline: ${totalMs}ms | Collection: ${collectMs}ms | Scoring: ${scoreMs}ms | Synthesis: ${groupMs}ms | Entities: ${entities.length} | Observations: ${observations.length} | Leads: ${leads.length}`
      );

      return leads;
    },
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

interface ScoredEntity {
  readonly entity: LeadEntity;
  readonly priority: number;
  readonly observations: Observation[];
}

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
): ScoredEntity[] => {
  const entityByKey = new Map(allEntities.map((e) => [entityToKey(e), e]));
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
  scoredEntities: ScoredEntity[],
  _config: LeadGenerationEngineConfig,
  logger: Logger,
  chatModel: InferenceChatModel
): Promise<Lead[]> => {
  const groups = groupByObservationPattern(scoredEntities);
  const now = new Date();

  const synthStart = Date.now();
  const llmResults = await llmSynthesizeBatch(chatModel, groups, logger);
  logger.debug(
    `[LeadGenerationEngine] LLM synthesis: ${Date.now() - synthStart}ms (${groups.length} leads)`
  );

  const leads: Lead[] = groups.map((group, i) => {
    const allObservations = group.flatMap((e) => e.observations);
    const maxPriority = Math.max(...group.map((e) => e.priority));
    const llm = llmResults[i];

    return {
      id: uuidv4(),
      title: llm.title,
      byline: buildByline(group, allObservations),
      description: llm.description,
      entities: group.map((e) => e.entity),
      tags: llm.tags,
      priority: maxPriority,
      chatRecommendations: llm.recommendations,
      timestamp: now.toISOString(),
      staleness: computeStaleness(now, now),
      observations: allObservations,
    };
  });

  leads.sort((a, b) => b.priority - a.priority);
  return leads;
};

/**
 * Each entity gets its own lead. In a future phase, entities can be grouped
 * into a single lead when they are linked to the same incident or campaign.
 */
const groupByObservationPattern = (scoredEntities: ScoredEntity[]): ScoredEntity[][] => {
  return scoredEntities.map((entity) => [entity]);
};

const buildByline = (group: ScoredEntity[], observations: Observation[]): string => {
  if (group.length === 1) {
    const { entity } = group[0];
    const entityObs = observations.filter((o) => o.entityId === entityToKey(entity));

    const totalAlerts = extractNumber(entityObs, 'total_alerts');
    const distinctRules =
      extractNumber(entityObs, 'distinct_rules') || extractNumber(entityObs, 'distinct_rule_count');
    const riskScore = extractNumber(entityObs, 'calculated_score_norm');

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
      return `${capitalize(entity.type)} ${entity.name} with ${parts.join(
        ', '
      )} in the last 7 days.`;
    }
    return `${capitalize(entity.type)} ${entity.name} with ${
      entityObs.length
    } observations in the last 7 days.`;
  }

  const names = group
    .map((e) => e.entity.name)
    .slice(0, 3)
    .join(', ');
  const extra = group.length > 3 ? ` and ${group.length - 3} more` : '';
  return `${group.length} entities (${names}${extra}) with correlated activity in the last 7 days.`;
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
