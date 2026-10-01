/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Client } from '@elastic/elasticsearch';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import { getLeadsIndexName } from '../../../../../common/entity_analytics/lead_generation/constants';
import { computeContentHash } from '../../../../../server/lib/entity_analytics/lead_generation/lead_matching';

export const DEFAULT_SPACE_ID = 'default';

/**
 * ES document shape (snake_case) as stored by the lead data client.
 * Mirrors the `EsLeadDoc` interface in `lead_data_client.ts`.
 */
interface EsLeadDoc {
  id: string;
  title: string;
  byline: string;
  description: string;
  entity: { type: string; name: string; id: string };
  tags: string[];
  priority: number;
  chat_recommendations: string[];
  timestamp: string;
  staleness: string;
  status: string;
  observations: Array<{
    entity_id: string;
    module_id: string;
    type: string;
    score: number;
    severity: string;
    confidence: number;
    description: string;
    metadata: Record<string, unknown>;
  }>;
  execution_uuid: string;
  source_type: string;
  created_at: string;
  changed_at: string;
  version: number;
  content_hash: string;
}

export interface SeedLeadOptions {
  readonly spaceId?: string;
  readonly status?: 'active' | 'dismissed' | 'expired';
  readonly priority?: number;
  readonly timestamp?: string;
  readonly changedAt?: string;
  readonly sourceType?: 'adhoc' | 'scheduled';
  /**
   * Distinct entity name. Lead `_id` is derived from the entity's EUID, so
   * seeding more than one lead in the same test requires a unique
   * `entityName` per call.
   */
  readonly entityName?: string;
}

/**
 * Seeds a minimal but fully valid lead document directly into the leads index,
 * bypassing the `POST /generate` route and its LLM dependency entirely.
 *
 * Document `_id` and `id` are the hash of the entity's EUID, matching
 * production writes. Returns that `id` so callers can reference it in API calls.
 */
export const seedLead = async (
  esClient: Client,
  options: SeedLeadOptions = {}
): Promise<{ id: string; executionUuid: string }> => {
  const {
    spaceId = DEFAULT_SPACE_ID,
    status = 'active',
    priority = 5,
    timestamp = new Date().toISOString(),
    changedAt = timestamp,
    sourceType = 'adhoc',
    entityName = 'john.doe',
  } = options;

  const executionUuid = uuidv4();
  const entityId = `user:${entityName}`;
  const entity = { type: 'user', id: entityId, name: entityName };
  const observations = [
    {
      entityId,
      moduleId: 'risk_analysis',
      type: 'high_risk_score',
      score: 85,
      severity: 'high' as const,
      confidence: 0.9,
      description: 'Risk score norm 85 (>= 70 threshold)',
      metadata: {},
    },
  ];
  const contentHash = computeContentHash({ observations });
  const id = hashEuid(entityId);

  const doc: EsLeadDoc = {
    id,
    title: `Test Lead: High Risk User Activity (${entityName})`,
    byline: `User ${entityName} shows multiple high-severity signals`,
    description:
      'Risk score escalated significantly over the past 24 hours with concurrent high-severity alerts.',
    entity,
    tags: ['risk_escalation', 'high_severity_alerts'],
    priority,
    chat_recommendations: [
      'What recent authentication events occurred for this user?',
      'Are there related alerts for this entity?',
    ],
    timestamp,
    staleness: 'fresh',
    status,
    observations: observations.map((o) => ({
      entity_id: o.entityId,
      module_id: o.moduleId,
      type: o.type,
      score: o.score,
      severity: o.severity,
      confidence: o.confidence,
      description: o.description,
      metadata: o.metadata,
    })),
    execution_uuid: executionUuid,
    source_type: sourceType,
    created_at: timestamp,
    changed_at: changedAt,
    version: 1,
    content_hash: contentHash,
  };

  const index = getLeadsIndexName(spaceId);
  await esClient.index({ index, id, document: doc, refresh: 'wait_for' });

  return { id, executionUuid };
};

/**
 * Removes all documents from the leads index for a given space.
 * Safe to call even when the index does not yet exist.
 */
export const cleanupLeadsIndex = async (
  esClient: Client,
  spaceId: string = DEFAULT_SPACE_ID
): Promise<void> => {
  await esClient
    .deleteByQuery({
      index: getLeadsIndexName(spaceId),
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    })
    .catch(() => {
      // Index may not exist — ignore
    });
};
