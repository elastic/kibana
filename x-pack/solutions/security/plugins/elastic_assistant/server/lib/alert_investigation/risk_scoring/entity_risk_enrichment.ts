/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EntityStoreDataClient } from '@kbn/security-solution-plugin/server/lib/entity_analytics/entity_store/entity_store_data_client';
import type { AlertWithId } from '../utils';

export interface EntityRiskScore {
  readonly entityName: string;
  readonly entityType: 'host' | 'user';
  readonly riskScore: number; // 0-100
  readonly riskLevel: 'Unknown' | 'Low' | 'Moderate' | 'High' | 'Critical';
}

export interface AlertWithRiskScore extends AlertWithId {
  readonly entityRiskScores: EntityRiskScore[];
  readonly adjustedRiskScore: number;
}

/**
 * Enriches alerts with Entity Store risk scores for dynamic prioritization
 *
 * Uses Security Solution's Entity Analytics to query risk scores for:
 * - Hosts (host.name, dest.ip resolved to hostname)
 * - Users (user.name)
 *
 * Adjusted risk = alert.risk_score × max(host_risk, user_risk) / 100
 *
 * This enables context-aware prioritization:
 * - High-risk entities investigated first
 * - Alerts on critical infrastructure elevated
 * - Adaptive to current threat landscape (not static rule scores)
 */
export async function enrichAlertsWithEntityRisk({
  alerts,
  entityStoreClient,
  logger,
}: {
  alerts: AlertWithId[];
  entityStoreClient: EntityStoreDataClient | null;
  logger: Logger;
}): Promise<AlertWithRiskScore[]> {
  // If Entity Store not available, use static risk scores
  if (!entityStoreClient) {
    logger.debug('Entity Store not available - using static risk scores');
    return alerts.map((alert) => ({
      ...alert,
      entityRiskScores: [],
      adjustedRiskScore: getRiskScoreFromAlert(alert),
    }));
  }

  const enrichedAlerts: AlertWithRiskScore[] = [];

  for (const alert of alerts) {
    const hostName = getHostName(alert._source);
    const userName = getUserName(alert._source);

    const entityRiskScores: EntityRiskScore[] = [];

    // Query host risk score
    if (hostName) {
      try {
        const hostRisk = await queryEntityRisk(entityStoreClient, 'host', hostName);
        if (hostRisk) {
          entityRiskScores.push(hostRisk);
        }
      } catch (error) {
        logger.debug(`Failed to query host risk for ${hostName}: ${error}`);
      }
    }

    // Query user risk score
    if (userName) {
      try {
        const userRisk = await queryEntityRisk(entityStoreClient, 'user', userName);
        if (userRisk) {
          entityRiskScores.push(userRisk);
        }
      } catch (error) {
        logger.debug(`Failed to query user risk for ${userName}: ${error}`);
      }
    }

    // Calculate adjusted risk score
    const staticRisk = getRiskScoreFromAlert(alert);
    const maxEntityRisk = entityRiskScores.length > 0
      ? Math.max(...entityRiskScores.map((e) => e.riskScore))
      : 50; // Neutral if no entity risk found

    // Adjusted = static × (entity_risk / 100)
    // Examples:
    // - Alert risk 75, host risk 100 (Critical) → 75 × 1.0 = 75 (elevated)
    // - Alert risk 75, host risk 25 (Low) → 75 × 0.25 = 18.75 (downgraded)
    const adjustedRiskScore = staticRisk * (maxEntityRisk / 100);

    enrichedAlerts.push({
      ...alert,
      entityRiskScores,
      adjustedRiskScore,
    });
  }

  logger.info(
    `Enriched ${alerts.length} alerts with entity risk scores. ` +
      `${enrichedAlerts.filter((a) => a.entityRiskScores.length > 0).length} alerts have entity context.`
  );

  return enrichedAlerts;
}

/**
 * Query Entity Store for risk score
 */
async function queryEntityRisk(
  client: EntityStoreDataClient,
  entityType: 'host' | 'user',
  entityName: string
): Promise<EntityRiskScore | null> {
  const result = await client.searchEntities({
    entityTypes: [entityType],
    filterQuery: `${entityType}.name: "${entityName}"`,
    page: 1,
    perPage: 1,
    sortField: '@timestamp',
    sortOrder: 'desc' as const,
  });

  if (!result.records || result.records.length === 0) {
    return null;
  }

  const entity = result.records[0];
  const riskScore = entity.asset?.criticality
    ? mapCriticalityToRiskScore(entity.asset.criticality)
    : 50; // Default to moderate if no criticality

  return {
    entityName,
    entityType,
    riskScore,
    riskLevel: mapScoreToLevel(riskScore),
  };
}

/**
 * Map asset criticality to risk score (0-100)
 */
function mapCriticalityToRiskScore(criticality: string): number {
  switch (criticality.toLowerCase()) {
    case 'low_impact':
      return 25;
    case 'medium_impact':
      return 50;
    case 'high_impact':
      return 75;
    case 'extreme_impact':
      return 100;
    default:
      return 50;
  }
}

/**
 * Map risk score to level
 */
function mapScoreToLevel(score: number): EntityRiskScore['riskLevel'] {
  if (score >= 90) return 'Critical';
  if (score >= 70) return 'High';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Low';
  return 'Unknown';
}

/**
 * Extract host name from alert
 */
function getHostName(alertSource: Record<string, unknown>): string | null {
  const hostName = (alertSource as any).host?.name;
  return typeof hostName === 'string' ? hostName : null;
}

/**
 * Extract user name from alert
 */
function getUserName(alertSource: Record<string, unknown>): string | null {
  const userName = (alertSource as any).user?.name;
  return typeof userName === 'string' ? userName : null;
}

/**
 * Get static risk score from alert
 */
function getRiskScoreFromAlert(alert: AlertWithId): number {
  const riskScore = (alert._source as any).kibana?.alert?.risk_score;
  return typeof riskScore === 'number' ? riskScore : 50;
}
