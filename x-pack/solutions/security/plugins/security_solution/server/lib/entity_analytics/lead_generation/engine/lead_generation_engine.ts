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
import { llmSynthesizeLeadContent } from './llm_synthesize';

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
      options?: { chatModel?: InferenceChatModel }
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

      // 3. Filter entities below threshold
      const qualifyingEntities = scoredEntities.filter(
        (e) => e.observations.length >= config.minObservations
      );

      if (qualifyingEntities.length === 0) {
        logger.debug('[LeadGenerationEngine] No entities met the threshold - no leads to generate');
        return [];
      }

      // 4. Group related entities into leads
      const groupStart = Date.now();
      const leads = await groupIntoLeads(qualifyingEntities, config, logger, options?.chatModel);
      const groupMs = Date.now() - groupStart;
      logger.debug(
        `[LeadGenerationEngine] Lead grouping & synthesis: ${groupMs}ms (${leads.length} leads)`
      );

      const totalMs = Date.now() - pipelineStart;
      logger.debug(
        `[LeadGenerationEngine] Total pipeline: ${totalMs}ms | Collection: ${collectMs}ms | Scoring: ${scoreMs}ms | Synthesis: ${groupMs}ms | Entities: ${entities.length} | Observations: ${observations.length} | Leads: ${leads.length}`
      );

      return leads.slice(0, config.maxLeads);
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
  chatModel?: InferenceChatModel
): Promise<Lead[]> => {
  const usedTitleTracker = new Map<string, number>();
  const groups = groupByObservationPattern(scoredEntities);
  const leads: Lead[] = [];
  const now = new Date();

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const allObservations = group.flatMap((e) => e.observations);
    const maxPriority = Math.max(...group.map((e) => e.priority));

    const entityLabel = group.map((e) => e.entity.name).join(', ');
    const synthStart = Date.now();
    const { title, byline, description, tags, recommendations } = await synthesizeLeadContent(
      group,
      allObservations,
      logger,
      usedTitleTracker,
      chatModel
    );
    const synthMs = Date.now() - synthStart;
    logger.debug(
      `[LeadGenerationEngine] Lead ${i + 1}/${
        groups.length
      } synthesis for [${entityLabel}]: ${synthMs}ms (${chatModel ? 'LLM' : 'rule-based'})`
    );

    leads.push({
      id: uuidv4(),
      title,
      byline,
      description,
      entities: group.map((e) => e.entity),
      tags,
      priority: maxPriority,
      chatRecommendations: recommendations,
      timestamp: now.toISOString(),
      staleness: computeStaleness(now, now),
      observations: allObservations,
    });
  }

  // Sort leads by priority descending
  leads.sort((a, b) => b.priority - a.priority);

  return leads;
};

/**
 * Each entity gets its own lead. The dominant observation pattern drives the
 * lead title and tags. In a future phase, entities can be grouped into a
 * single lead when they are linked to the same incident or campaign.
 */
const groupByObservationPattern = (scoredEntities: ScoredEntity[]): ScoredEntity[][] => {
  return scoredEntities.map((entity) => [entity]);
};

const synthesizeLeadContent = async (
  group: ScoredEntity[],
  observations: Observation[],
  logger: Logger,
  usedTitleTracker: Map<string, number>,
  chatModel?: InferenceChatModel
): Promise<{
  title: string;
  byline: string;
  description: string;
  tags: string[];
  recommendations: string[];
}> => {
  if (chatModel) {
    try {
      const llmResult = await llmSynthesizeLeadContent(chatModel, group, observations, logger);
      const dominantPattern = selectDominantPattern(observations, usedTitleTracker);
      const byline = buildByline(group, observations, dominantPattern);

      return {
        title: llmResult.title,
        byline,
        description: llmResult.description,
        tags: llmResult.tags,
        recommendations: llmResult.recommendations,
      };
    } catch (error) {
      logger.warn(
        `[LeadGenerationEngine] LLM synthesis failed, falling back to rule-based: ${error}`
      );
    }
  }

  return ruleSynthesizeLeadContent(group, observations, usedTitleTracker);
};

const ruleSynthesizeLeadContent = (
  group: ScoredEntity[],
  observations: Observation[],
  usedTitleTracker: Map<string, number>
): {
  title: string;
  byline: string;
  description: string;
  tags: string[];
  recommendations: string[];
} => {
  const observationTypes = [...new Set(observations.map((o) => o.type))];

  const dominantPattern = selectDominantPattern(observations, usedTitleTracker);

  const title = buildRuleBasedTitle(group, dominantPattern);
  const byline = buildByline(group, observations, dominantPattern);
  const description = buildDescription(group, observations);
  const tags = buildTags(observationTypes, observations);
  const recommendations = buildRecommendations(group, observations);

  return { title, byline, description, tags, recommendations };
};

interface DominantPattern {
  readonly label: string;
  readonly key: string;
}

/**
 * Pattern metadata: human label and a "distinctiveness" weight that biases
 * selection toward patterns that are more meaningful for investigation.
 *
 * The selection algorithm scores each observation type present in the lead's
 * observations as:
 *
 *   pattern_score = distinctiveness_weight x best_observation_score x confidence
 *
 * where `best_observation_score` is the highest raw score among observations
 * of that type. The pattern with the highest pattern_score wins.
 *
 * This means a very high-scoring `risk_escalation` can outrank a mediocre
 * `multi_tactic_attack`, producing titles that reflect what actually stands
 * out about the entity rather than defaulting to a fixed priority list.
 */
const PATTERN_CATALOG: Record<string, { labels: string[]; distinctiveness: number }> = {
  privileged_high_risk: {
    labels: [
      'Privileged High-Risk Entity',
      'Elevated Privileged Access',
      'High-Risk Privileged Account',
      'Admin Account Risk',
    ],
    distinctiveness: 1.4,
  },
  privilege_escalation: {
    labels: [
      'Privilege Escalation',
      'Privileged Access Change',
      'Elevated Permissions Granted',
      'Privilege Increase Detected',
    ],
    distinctiveness: 1.2,
  },
  investigation_status: {
    labels: ['Under Investigation', 'Active Investigation', 'Entity Under Review'],
    distinctiveness: 1.0,
  },
  watchlist_inclusion: {
    labels: ['Watchlist Addition', 'Added to Watchlist', 'New Watchlist Member'],
    distinctiveness: 0.9,
  },
  multi_tactic_attack: {
    labels: [
      'Multi-Tactic Attack',
      'Cross-Technique Threat',
      'Multi-Vector Intrusion',
      'Coordinated Attack Pattern',
      'Compound Threat Activity',
    ],
    distinctiveness: 1.15,
  },
  risk_escalation: {
    labels: [
      'Risk Score Escalation',
      'Rapid Risk Increase',
      'Anomalous Risk Spike',
      'Sudden Risk Surge',
    ],
    distinctiveness: 1.1,
  },
  risk_escalation_24h: {
    labels: [
      'Risk Score Escalation',
      'Rapid Risk Increase',
      'Anomalous Risk Spike',
      'Sudden Risk Surge',
    ],
    distinctiveness: 1.2,
  },
  risk_escalation_7d: {
    labels: [
      'Risk Score Escalation',
      'Rapid Risk Increase',
      'Anomalous Risk Spike',
      'Sudden Risk Surge',
    ],
    distinctiveness: 1.1,
  },
  risk_escalation_90d: {
    labels: [
      'Risk Score Escalation',
      'Rapid Risk Increase',
      'Anomalous Risk Spike',
      'Sudden Risk Surge',
    ],
    distinctiveness: 1.0,
  },
  alert_volume_spike: {
    labels: [
      'Alert Volume Spike',
      'Alert Surge Detected',
      'Abnormal Alert Frequency',
      'Burst of Detections',
    ],
    distinctiveness: 1.05,
  },
  high_severity_alerts: {
    labels: [
      'High Severity Alerts',
      'Critical Alert Activity',
      'Severe Threat Signals',
      'Urgent Alert Cluster',
    ],
    distinctiveness: 1.0,
  },
  high_risk_score: {
    labels: [
      'High Risk Entity',
      'Elevated Threat Profile',
      'Persistent High Risk',
      'Sustained Risk Exposure',
    ],
    distinctiveness: 0.9,
  },
  medium_severity_alerts: {
    labels: ['Medium Severity Alerts', 'Moderate Alert Activity', 'Watchlist Alert Pattern'],
    distinctiveness: 0.7,
  },
  moderate_risk_score: {
    labels: ['Moderate Risk Entity', 'Emerging Risk Profile', 'Growing Risk Indicator'],
    distinctiveness: 0.6,
  },
  low_severity_alerts: {
    labels: ['Low Severity Alerts', 'Minor Alert Activity', 'Low-Level Detections'],
    distinctiveness: 0.4,
  },
  low_risk_score: {
    labels: ['Low Risk Entity', 'Baseline Risk Activity', 'Minimal Risk Indicator'],
    distinctiveness: 0.3,
  },
};

const selectDominantPattern = (
  observations: Observation[],
  usedTitleTracker: Map<string, number>
): DominantPattern => {
  const bestByType = new Map<string, { score: number; confidence: number }>();

  for (const obs of observations) {
    const current = bestByType.get(obs.type);
    const effectiveScore = obs.score * obs.confidence;
    if (!current || effectiveScore > current.score * current.confidence) {
      bestByType.set(obs.type, { score: obs.score, confidence: obs.confidence });
    }
  }

  const ranked: Array<{ key: string; patternScore: number }> = [];

  for (const [obsType, { score, confidence }] of bestByType.entries()) {
    const catalog = PATTERN_CATALOG[obsType];
    if (catalog) {
      ranked.push({ key: obsType, patternScore: catalog.distinctiveness * score * confidence });
    }
  }

  ranked.sort((a, b) => b.patternScore - a.patternScore);

  for (const { key } of ranked) {
    const catalog = PATTERN_CATALOG[key];
    if (catalog) {
      const usedCount = usedTitleTracker.get(key) ?? 0;
      if (usedCount < catalog.labels.length) {
        const label = catalog.labels[usedCount];
        usedTitleTracker.set(key, usedCount + 1);
        return { label, key };
      }
    }
  }

  if (ranked.length > 0) {
    const fallbackKey = ranked[0].key;
    const catalog = PATTERN_CATALOG[fallbackKey];
    if (catalog) {
      const idx = (usedTitleTracker.get(fallbackKey) ?? 0) % catalog.labels.length;
      usedTitleTracker.set(fallbackKey, idx + 1);
      return { label: catalog.labels[idx], key: fallbackKey };
    }
  }

  return { label: 'Suspicious Activity', key: 'unknown' };
};

const buildRuleBasedTitle = (_group: ScoredEntity[], pattern: DominantPattern): string =>
  pattern.label;

const buildByline = (
  group: ScoredEntity[],
  observations: Observation[],
  _pattern: DominantPattern
): string => {
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

const buildDescription = (group: ScoredEntity[], observations: Observation[]): string => {
  const seen = new Set<string>();
  const bullets: string[] = [];

  for (const scored of group) {
    const { entity } = scored;
    const entityObs = observations.filter((o) => o.entityId === entityToKey(entity));
    for (const obs of entityObs) {
      const normalized = obs.description.trim().toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        const desc = obs.description.trim();
        bullets.push(desc.charAt(0).toUpperCase() + desc.slice(1));
      }
    }
  }

  return bullets.join('\n');
};

/**
 * Extract technique-level tags from observations. Uses detection rule names
 * found in alert metadata (the closest proxy we have for MITRE techniques)
 * rather than generic tactic labels.
 */
const buildTags = (_observationTypes: string[], observations: Observation[]): string[] => {
  const ruleNames = new Set<string>();

  for (const obs of observations) {
    const names = obs.metadata.rule_names;
    if (Array.isArray(names)) {
      for (const name of names) {
        if (typeof name === 'string' && name.length > 0) {
          ruleNames.add(name);
        }
      }
    }
    const ruleName = obs.metadata.ruleName;
    if (typeof ruleName === 'string' && ruleName.length > 0) {
      ruleNames.add(ruleName);
    }
  }

  if (ruleNames.size === 0) {
    const fallback: string[] = [];
    const types = new Set(_observationTypes);
    if (
      types.has('risk_escalation') ||
      types.has('risk_escalation_24h') ||
      types.has('risk_escalation_7d') ||
      types.has('risk_escalation_90d')
    )
      fallback.push('Risk escalation');
    if (types.has('high_risk_score')) fallback.push('High risk score');
    if (types.has('privileged_high_risk')) fallback.push('Privileged entity');
    if (types.has('high_severity_alerts')) fallback.push('High severity alerts');
    if (types.has('alert_volume_spike')) fallback.push('Alert spike');
    return fallback;
  }

  return [...ruleNames].slice(0, 6);
};

const buildRecommendations = (group: ScoredEntity[], observations: Observation[]): string[] => {
  const recommendations: string[] = [];
  const entityNames = group.map((e) => `"${e.entity.name}"`).join(', ');
  const entityCount = group.length;

  // 1. Alert triage prompt
  const alertObs = observations.filter((o) => o.moduleId === 'behavioral_analysis');
  if (alertObs.length > 0) {
    const severities = [...new Set(alertObs.map((o) => o.severity))].join('/');
    recommendations.push(
      `Show me the ${severities} severity alerts for ${entityNames} from the last 7 days, grouped by detection rule name`
    );
  }

  // 2. Risk timeline prompt
  const riskObs = observations.filter((o) => o.moduleId === 'risk_analysis');
  if (riskObs.length > 0) {
    recommendations.push(
      `Generate an ESQL query to show the risk score trend for ${entityNames} over the last 30 days`
    );
  }

  // 3. Process/network activity
  if (entityCount === 1) {
    const { name, type } = group[0].entity;
    recommendations.push(
      `What processes or network connections has ${type} "${name}" initiated in the last 48 hours?`
    );
  }

  // 4. Lateral movement / correlation
  if (entityCount > 1) {
    recommendations.push(
      `Are there any shared source IPs, destination hosts, or file hashes between ${entityNames}?`
    );
  } else {
    const { name, type } = group[0].entity;
    recommendations.push(
      `Has ${type} "${name}" accessed any hosts or services it has not used in the past 30 days?`
    );
  }

  // 5. Containment / response
  recommendations.push(
    `Based on the observations above, recommend containment actions and create a case for ${entityNames}`
  );

  return recommendations.slice(0, 5);
};
