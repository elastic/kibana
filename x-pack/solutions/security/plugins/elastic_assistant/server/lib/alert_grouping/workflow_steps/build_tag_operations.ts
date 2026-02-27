/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrichedAlert, AlertDocument } from '../services/hybrid_alert_deduplication';
import { getVal } from '../services/hybrid_alert_deduplication';

interface BulkOperation {
  update: { _index: string; _id: string };
}

interface BulkBody {
  doc: {
    'kibana.alert.dedup': {
      cluster_id: string;
      is_leader: boolean;
      confidence: 'high' | 'llm' | 'new';
      follower_count?: number;
      processed_at: string;
    };
  };
}

/**
 * Builds bulk update operations to tag deduplicated alerts.
 * Returns an array of alternating action/body pairs for elasticsearch.bulk.
 */
export const buildTagOperations = (
  leaders: EnrichedAlert[],
  alertIndex: string
): Array<BulkOperation | BulkBody> => {
  const operations: Array<BulkOperation | BulkBody> = [];
  const processedAt = new Date().toISOString();

  for (const leader of leaders) {
    const leaderId = getAlertId(leader);
    if (leaderId) {
      const followers = leader.followers ?? [];
      const followerCount = followers.length;

      // Tag the leader
      operations.push(
        { update: { _index: alertIndex, _id: leaderId } },
        {
          doc: {
            'kibana.alert.dedup': {
              cluster_id: leaderId,
              is_leader: true,
              confidence: 'new',
              follower_count: followerCount,
              processed_at: processedAt,
            },
          },
        }
      );

      // Tag each follower
      for (const follower of followers) {
        const followerId = getAlertId(follower);
        if (followerId) {
          const confidence = determineConfidence(follower);
          operations.push(
            { update: { _index: alertIndex, _id: followerId } },
            {
              doc: {
                'kibana.alert.dedup': {
                  cluster_id: leaderId,
                  is_leader: false,
                  confidence,
                  processed_at: processedAt,
                },
              },
            }
          );
        }
      }
    }
  }

  return operations;
};

/**
 * Extracts the alert ID from an alert document.
 * Works with both raw ES hits (_id) and flat alert documents.
 */
const getAlertId = (alert: AlertDocument): string | undefined => {
  // ES search hit format
  const esId = alert._id as string | undefined;
  if (esId) return esId;

  // Flat field format
  const kibanaId = getVal(alert, 'kibana.alert.uuid') as string | undefined;
  if (kibanaId) return kibanaId;

  return getVal(alert, 'event.id') as string | undefined;
};

/**
 * Determines the confidence level for a follower alert.
 * This is a heuristic based on whether the follower was matched
 * via vector (high), exception list (high), or LLM (llm).
 */
const determineConfidence = (_follower: AlertDocument): 'high' | 'llm' => {
  // In the current HybridClustering implementation, followers matched via
  // Stage 1 (vector threshold) or exception list are high confidence.
  // Followers matched via Stage 2 (LLM) are llm confidence.
  // Since the current API doesn't track match method on individual followers,
  // we default to 'high' — a future improvement can add match method tracking.
  return 'high';
};

/**
 * Builds leader summary objects for the step output.
 */
export const buildLeaderSummaries = (
  leaders: EnrichedAlert[]
): Array<{
  alertId: string;
  ruleName?: string;
  followerCount: number;
  confidence: 'high' | 'llm' | 'new';
}> => {
  return leaders.map((leader) => ({
    alertId: getAlertId(leader) ?? 'unknown',
    ruleName:
      (getVal(leader, 'kibana.alert.rule.name') as string | undefined) ??
      (getVal(leader, 'rule.name') as string | undefined),
    followerCount: leader.followers?.length ?? 0,
    confidence: 'new' as const,
  }));
};
