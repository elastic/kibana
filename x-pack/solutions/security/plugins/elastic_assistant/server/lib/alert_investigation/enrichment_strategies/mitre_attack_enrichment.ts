/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EnrichmentStrategy, EnrichedEntity, EnrichmentResult } from '../enrichment';
import type { ExtractedEntity, PipelineConfig } from '../types';

/**
 * MITRE ATT&CK technique metadata used for correlation scoring.
 * Techniques sharing a tactic are more likely to be part of the same attack chain.
 */
interface MitreTechnique {
  readonly id: string;
  readonly name: string;
  readonly tactic: string;
  readonly subtechnique?: string;
}

/**
 * Correlates entities across a pipeline run by mapping alerts back to their
 * MITRE ATT&CK techniques and identifying multi-technique attack chains.
 *
 * Enrichment logic:
 * 1. Extracts MITRE technique/tactic from each entity's originating alert
 * 2. Queries the alerts index for recent alerts sharing the same host/user
 *    that map to different techniques within the same tactic (lateral chain)
 * 3. Tags entities involved in multi-step chains with higher severity
 */
export class MitreAttackEnrichment implements EnrichmentStrategy {
  readonly id = 'mitre_attack';
  readonly name = 'MITRE ATT&CK Correlation';

  constructor(private readonly esClient: ElasticsearchClient, private readonly spaceId: string) {}

  async enrich({
    entities,
    config,
    logger,
  }: {
    entities: ExtractedEntity[];
    config: PipelineConfig;
    logger: Logger;
  }): Promise<EnrichmentResult> {
    if (entities.length === 0) {
      return {
        enrichedEntities: [],
        stats: { totalEnriched: 0, bySource: {} },
      };
    }

    const alertIds = [...new Set(entities.map((e) => e.alertId))];
    const alertTechniqueMap = await this.fetchAlertTechniques(alertIds, logger);

    if (alertTechniqueMap.size === 0) {
      return {
        enrichedEntities: entities.map((e) => ({ ...e })),
        stats: { totalEnriched: 0, bySource: {} },
      };
    }

    const hostValues = entities
      .filter((e) => e.typeKey === 'hostname')
      .map((e) => e.value.toLowerCase());
    const userValues = entities
      .filter((e) => e.typeKey === 'user')
      .map((e) => e.value.toLowerCase());

    const chainMap = await this.findAttackChains({
      hostValues,
      userValues,
      alertTechniqueMap,
      lookbackDays: config.caseMatching.temporalDecayDays,
      logger,
    });

    let enrichedCount = 0;
    const enrichedEntities: EnrichedEntity[] = entities.map((entity) => {
      const techniques = alertTechniqueMap.get(entity.alertId);
      if (!techniques || techniques.length === 0) {
        return { ...entity };
      }

      const chainLength = chainMap.get(entity.alertId) ?? 0;
      const severity = computeSeverity(techniques.length, chainLength);

      enrichedCount++;
      return {
        ...entity,
        enrichments: [
          ...((entity as EnrichedEntity).enrichments ?? []),
          {
            source: 'mitre_attack',
            type: 'mitre_attack' as const,
            severity,
            details: {
              techniques: techniques.map((t) => ({
                id: t.id,
                name: t.name,
                tactic: t.tactic,
                ...(t.subtechnique ? { subtechnique: t.subtechnique } : {}),
              })),
              tactics: [...new Set(techniques.map((t) => t.tactic))],
              chain_length: chainLength,
              multi_technique: techniques.length > 1,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    });

    logger.info(
      `MITRE ATT&CK enrichment: ${enrichedCount}/${entities.length} entities correlated across ${alertTechniqueMap.size} alert(s)`
    );

    return {
      enrichedEntities,
      stats: { totalEnriched: enrichedCount, bySource: { mitre_attack: enrichedCount } },
    };
  }

  private async fetchAlertTechniques(
    alertIds: string[],
    logger: Logger
  ): Promise<Map<string, MitreTechnique[]>> {
    const index = resolveAlertsIndex(this.spaceId);
    const techniqueMap = new Map<string, MitreTechnique[]>();

    try {
      const result = await this.esClient.search({
        index,
        size: alertIds.length,
        query: { ids: { values: alertIds } },
        _source: ['kibana.alert.rule.threat', 'kibana.alert.rule.name'],
      });

      for (const hit of result.hits.hits) {
        if (hit._id && hit._source) {
          const techniques = extractTechniquesFromSource(hit._source as Record<string, unknown>);
          if (techniques.length > 0) {
            techniqueMap.set(hit._id, techniques);
          }
        }
      }
    } catch (error) {
      logger.warn(
        `MITRE technique lookup failed: ${error instanceof Error ? error.message : error}`
      );
    }

    return techniqueMap;
  }

  /**
   * Finds attack chains by querying for additional alerts on the same hosts/users
   * that use different MITRE techniques within the same tactic family.
   * Returns a map of alertId → chain length (number of related techniques).
   */
  private async findAttackChains({
    hostValues,
    userValues,
    alertTechniqueMap,
    lookbackDays,
    logger,
  }: {
    hostValues: string[];
    userValues: string[];
    alertTechniqueMap: Map<string, MitreTechnique[]>;
    lookbackDays: number;
    logger: Logger;
  }): Promise<Map<string, number>> {
    const chainMap = new Map<string, number>();

    if (hostValues.length === 0 && userValues.length === 0) {
      return chainMap;
    }

    const index = resolveAlertsIndex(this.spaceId);

    try {
      const shouldClauses: Array<Record<string, unknown>> = [];
      if (hostValues.length > 0) {
        shouldClauses.push({ terms: { 'host.name': hostValues } });
      }
      if (userValues.length > 0) {
        shouldClauses.push({ terms: { 'user.name': userValues } });
      }

      const result = await this.esClient.search({
        index,
        size: 500,
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: `now-${lookbackDays}d` } } },
              { exists: { field: 'kibana.alert.rule.threat' } },
            ],
            should: shouldClauses,
            minimum_should_match: 1,
          },
        },
        _source: ['kibana.alert.rule.threat'],
      });

      const allTactics = new Map<string, Set<string>>();
      for (const techniques of alertTechniqueMap.values()) {
        for (const t of techniques) {
          const existing = allTactics.get(t.tactic) ?? new Set();
          existing.add(t.id);
          allTactics.set(t.tactic, existing);
        }
      }

      for (const hit of result.hits.hits) {
        if (hit._source) {
          const neighborTechniques = extractTechniquesFromSource(
            hit._source as Record<string, unknown>
          );
          for (const nt of neighborTechniques) {
            const tacticTechniques = allTactics.get(nt.tactic);
            if (tacticTechniques && !tacticTechniques.has(nt.id)) {
              tacticTechniques.add(nt.id);
            }
          }
        }
      }

      for (const [alertId, techniques] of alertTechniqueMap) {
        let maxChain = 0;
        for (const t of techniques) {
          const tacticSize = allTactics.get(t.tactic)?.size ?? 0;
          maxChain = Math.max(maxChain, tacticSize);
        }
        chainMap.set(alertId, maxChain);
      }
    } catch (error) {
      logger.warn(
        `MITRE chain discovery failed: ${error instanceof Error ? error.message : error}`
      );
    }

    return chainMap;
  }
}

const resolveAlertsIndex = (spaceId: string): string =>
  spaceId === 'default' ? '.alerts-security.alerts-default' : `.alerts-security.alerts-${spaceId}`;

/**
 * Extracts MITRE ATT&CK techniques from the ECS `kibana.alert.rule.threat` field.
 * The threat field follows the ECS threat framework mapping structure.
 */
const extractTechniquesFromSource = (source: Record<string, unknown>): MitreTechnique[] => {
  const techniques: MitreTechnique[] = [];
  const kibana = source.kibana as Record<string, unknown> | undefined;
  const alert = kibana?.alert as Record<string, unknown> | undefined;
  const rule = alert?.rule as Record<string, unknown> | undefined;
  const threats = rule?.threat as Array<Record<string, unknown>> | undefined;

  if (!Array.isArray(threats)) return techniques;

  for (const threat of threats) {
    const framework = threat.framework as string | undefined;
    if (framework && framework !== 'MITRE ATT&CK') {
      // Not a MITRE threat mapping — skip
    } else {
      const tactic = threat.tactic as Record<string, unknown> | undefined;
      const tacticName = (tactic?.name as string) ?? 'unknown';

      const techniqueDefs = threat.technique as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(techniqueDefs)) {
        for (const tech of techniqueDefs) {
          const techId = tech.id as string | undefined;
          const techName = tech.name as string | undefined;
          if (techId && techName) {
            techniques.push({ id: techId, name: techName, tactic: tacticName });

            const subtechniques = tech.subtechnique as Array<Record<string, unknown>> | undefined;
            if (Array.isArray(subtechniques)) {
              for (const sub of subtechniques) {
                const subId = sub.id as string | undefined;
                const subName = sub.name as string | undefined;
                if (subId && subName) {
                  techniques.push({
                    id: subId,
                    name: subName,
                    tactic: tacticName,
                    subtechnique: techId,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return techniques;
};

const computeSeverity = (
  techniqueCount: number,
  chainLength: number
): 'low' | 'medium' | 'high' | 'critical' => {
  if (chainLength >= 4 || techniqueCount >= 3) return 'critical';
  if (chainLength >= 3 || techniqueCount >= 2) return 'high';
  if (chainLength >= 2) return 'medium';
  return 'low';
};
