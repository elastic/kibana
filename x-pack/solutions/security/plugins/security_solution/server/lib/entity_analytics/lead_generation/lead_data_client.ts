/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';

import {
  getLeadsIndexName,
  type LeadGenerationMode,
} from '../../../../common/entity_analytics/lead_generation/constants';
import {
  type Lead,
  type LeadStatus,
  type LeadStaleness,
  LeadStatusEnum,
} from '../../../../common/entity_analytics/lead_generation/types';
import { computeContentHash, computeEntityIdentityKey } from './content_hash';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadDataClientDeps {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly spaceId: string;
}

interface LeadActionCandidate {
  readonly entityIdentityKey: string;
  readonly contentHash: string;
}

type LeadPersistDecision =
  | { readonly type: 'dedup'; readonly existingId: string }
  | { readonly type: 'version'; readonly existingId: string }
  | { readonly type: 'create' }
  | { readonly type: 'skip' };

export interface LeadActionDecision<T extends LeadActionCandidate = LeadActionCandidate> {
  readonly candidate: T;
  readonly decision: LeadPersistDecision;
}

interface PersistLeadsParams {
  readonly executionId: string;
  readonly sourceType: LeadGenerationMode;
  readonly timestamp: string;
  readonly dedups: ReadonlyArray<{ readonly existingId: string }>;
  readonly creates: readonly Lead[];
  readonly versions: ReadonlyArray<{ readonly existingId: string; readonly lead: Lead }>;
}

export interface FindLeadsParams {
  readonly page?: number;
  readonly perPage?: number;
  readonly sortField?: 'priority' | 'timestamp';
  readonly sortOrder?: 'asc' | 'desc';
  readonly status?: LeadStatus;
}

export interface FindLeadsResult {
  readonly leads: Lead[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
}

export interface LeadDataClient {
  classifyLeadCandidates<T extends LeadActionCandidate>(
    candidates: ReadonlyArray<T>
  ): Promise<ReadonlyArray<LeadActionDecision<T>>>;
  persistLeads(params: PersistLeadsParams): Promise<void>;
  findLeads(params: FindLeadsParams): Promise<FindLeadsResult>;
  updateLead(id: string, updates: Partial<Pick<Lead, 'status'>>): Promise<boolean>;
  dismissLead(id: string): Promise<boolean>;
  bulkUpdateLeads(ids: readonly string[], updates: { status: LeadStatus }): Promise<number>;
  getStatus(options?: { isEnabled?: boolean }): Promise<{
    isEnabled: boolean;
    indexExists: boolean;
    totalLeads: number;
    lastRun: string | null;
  }>;
  deleteAllLeads(): Promise<void>;
}

// ---------------------------------------------------------------------------
// ES error classification helpers
// ---------------------------------------------------------------------------

const getEsErrorType = (e: unknown): string | undefined =>
  (e as { meta?: { body?: { error?: { type?: string } } } })?.meta?.body?.error?.type;

const isEsSecurityException = (e: unknown): boolean => getEsErrorType(e) === 'security_exception';

const isEsIndexNotFoundException = (e: unknown): boolean =>
  getEsErrorType(e) === 'index_not_found_exception';

// ---------------------------------------------------------------------------
// Staleness computation (timestamp-based, computed at read time)
// ---------------------------------------------------------------------------

const STALENESS_THRESHOLDS = {
  fresh: 24 * 60 * 60 * 1000,
  stale: 72 * 60 * 60 * 1000,
};

const computeStaleness = (timestamp: string): LeadStaleness => {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (ageMs <= STALENESS_THRESHOLDS.fresh) return 'fresh';
  if (ageMs <= STALENESS_THRESHOLDS.stale) return 'stale';
  return 'expired';
};

// ---------------------------------------------------------------------------
// camelCase ↔ snake_case transform layer
// ---------------------------------------------------------------------------

interface EsObservationDoc {
  entity_id: string;
  module_id: string;
  type: string;
  score: number;
  severity: string;
  confidence: number;
  description: string;
  metadata: Record<string, unknown>;
}

interface EsLeadDoc {
  id: string;
  title: string;
  byline: string;
  description: string;
  entities: Array<{ type: string; name: string; id?: string }>;
  tags: string[];
  priority: number;
  chat_recommendations: string[];
  timestamp: string;
  staleness: string;
  status: string;
  observations: EsObservationDoc[];
  execution_uuid: string;
  source_type: string;
  created_at: string;
  updated_at: string;
  version: number;
  content_hash: string;
  entity_identity_key: string;
}

interface ExistingLeadLookup {
  id: string;
  contentHash: string;
  entityIdentityKey: string;
  version: number;
  status: LeadStatus;
}

/** Partial `_source` returned by the matching-lead mget. */
interface LeadLookupSource {
  content_hash?: string;
  entity_identity_key?: string;
  version?: number;
  status?: string;
}

const leadToEsDoc = (
  lead: Lead,
  executionId: string,
  sourceType: LeadGenerationMode
): EsLeadDoc => {
  const entityIdentityKey = computeEntityIdentityKey({ entities: lead.entities });
  const timestamp = lead.timestamp;
  return {
    id: entityIdentityKey,
    title: lead.title,
    byline: lead.byline,
    description: lead.description,
    entities: lead.entities.map(({ type, name, id }) => ({ type, name, id })),
    tags: lead.tags,
    priority: lead.priority,
    chat_recommendations: lead.chatRecommendations,
    timestamp,
    staleness: lead.staleness,
    status: lead.status ?? 'active',
    observations: lead.observations.map((obs) => ({
      entity_id: obs.entityId,
      module_id: obs.moduleId,
      type: obs.type,
      score: obs.score,
      severity: obs.severity,
      confidence: obs.confidence,
      description: obs.description,
      metadata: obs.metadata,
    })),
    execution_uuid: executionId,
    source_type: sourceType,
    created_at: lead.createdAt ?? timestamp,
    updated_at: lead.updatedAt ?? timestamp,
    version: 1,
    content_hash: computeContentHash({ observations: lead.observations }),
    entity_identity_key: entityIdentityKey,
  };
};

const esDocToLead = (doc: Record<string, unknown>): Lead => {
  const observations = (doc.observations as EsObservationDoc[] | undefined) ?? [];
  const timestamp = (doc.timestamp as string) ?? new Date().toISOString();

  return {
    id: doc.id as string,
    title: doc.title as string,
    byline: (doc.byline as string) ?? '',
    description: (doc.description as string) ?? '',
    entities: (doc.entities as Array<{ type: string; name: string; id?: string }>) ?? [],
    tags: (doc.tags as string[]) ?? [],
    priority: (doc.priority as number) ?? 1,
    chatRecommendations: (doc.chat_recommendations as string[]) ?? [],
    timestamp,
    staleness: computeStaleness(timestamp),
    status: (doc.status as LeadStatus) ?? 'active',
    observations: observations.map((obs) => ({
      entityId: obs.entity_id,
      moduleId: obs.module_id,
      type: obs.type,
      score: obs.score,
      severity: obs.severity as Lead['observations'][number]['severity'],
      confidence: obs.confidence,
      description: obs.description,
      metadata: obs.metadata ?? {},
    })),
    executionUuid: (doc.execution_uuid as string) ?? '',
    sourceType: (doc.source_type as Lead['sourceType']) ?? 'adhoc',
    createdAt: (doc.created_at as string) ?? timestamp,
    updatedAt: (doc.updated_at as string) ?? timestamp,
  };
};

/**
 * Painless body for lead update operations
 * - Same content_hash + dismissed: noop (do not reopen)
 * - Same content_hash otherwise: refresh timestamp / reactivate (dedup / expire resurface)
 * - Different content_hash: replace evidence + narrative and bump version
 * - Never touches created_at
 */
const LEAD_UPDATE_SCRIPT_SOURCE = `
if (ctx._source.content_hash == params.content_hash) {
  if (ctx._source.status == 'dismissed') {
    ctx.op = 'noop';
  } else {
    ctx._source.timestamp = params.timestamp;
    ctx._source.status = 'active';
    ctx._source.updated_at = params.timestamp;
    ctx._source.execution_uuid = params.execution_uuid;
    ctx._source.source_type = params.source_type;
  }
} else {
  ctx._source.id = params.id;
  ctx._source.entity_identity_key = params.entity_identity_key;
  ctx._source.observations = params.observations;
  ctx._source.title = params.title;
  ctx._source.byline = params.byline;
  ctx._source.description = params.description;
  ctx._source.tags = params.tags;
  ctx._source.chat_recommendations = params.chat_recommendations;
  ctx._source.entities = params.entities;
  ctx._source.priority = params.priority;
  ctx._source.staleness = params.staleness;
  ctx._source.content_hash = params.content_hash;
  ctx._source.execution_uuid = params.execution_uuid;
  ctx._source.source_type = params.source_type;
  ctx._source.status = params.status;
  ctx._source.version = (ctx._source.containsKey('version') ? (int) ctx._source.version : 0) + 1;
  ctx._source.updated_at = params.timestamp;
  ctx._source.timestamp = params.timestamp;
}
`.trim();

// ES optimistic-concurrency retries for lead updates (adhoc vs scheduled races)
const LEAD_UPDATE_RETRY_ON_CONFLICT = 3;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createLeadDataClient = ({
  esClient,
  logger,
  spaceId,
}: LeadDataClientDeps): LeadDataClient => {
  const indexName = getLeadsIndexName(spaceId);

  const findMatchingLeads = async (
    entityKeys: string[]
  ): Promise<Map<string, ExistingLeadLookup>> => {
    const matchingByKey = new Map<string, ExistingLeadLookup>();
    const uniqueKeys = [...new Set(entityKeys)];
    if (uniqueKeys.length === 0) {
      return matchingByKey;
    }

    try {
      const resp = await esClient.mget<LeadLookupSource>({
        index: indexName,
        ids: uniqueKeys,
        _source: ['content_hash', 'entity_identity_key', 'version', 'status'],
      });

      for (const doc of resp.docs) {
        if ('found' in doc && doc.found && doc._id && doc._source && doc._source.content_hash) {
          matchingByKey.set(doc._id, {
            id: doc._id,
            contentHash: doc._source.content_hash,
            entityIdentityKey: doc._source.entity_identity_key ?? doc._id,
            version: doc._source.version ?? 1,
            status: LeadStatusEnum.safeParse(doc._source.status).data ?? 'active',
          });
        }
      }
    } catch (e) {
      if (isEsSecurityException(e)) {
        throw e;
      }
      if (isEsIndexNotFoundException(e)) {
        return matchingByKey;
      }
      throw e;
    }

    return matchingByKey;
  };

  /**
   * Classify each candidate against existing leads
   * - Dedup: active/expired lead with the same observations (expired resurfaces as active)
   * - Version: active/expired with different observations, OR dismissed with new evidence
   * - Skip: dismissed lead with the same observations (do not reopen)
   * - Create: no matching lead for the entity
   */
  const classifyLeadCandidates = async <T extends LeadActionCandidate>(
    candidates: ReadonlyArray<T>
  ): Promise<ReadonlyArray<LeadActionDecision<T>>> => {
    if (candidates.length === 0) {
      return [];
    }

    const matchingLeads = await findMatchingLeads(candidates.map((c) => c.entityIdentityKey));

    return candidates.map((candidate) => {
      const matchingLead = matchingLeads.get(candidate.entityIdentityKey);
      if (!matchingLead) {
        return { candidate, decision: { type: 'create' } };
      }

      const sameLeadContent = matchingLead.contentHash === candidate.contentHash;
      if (matchingLead.status === 'dismissed') {
        if (sameLeadContent) {
          logger.debug(
            `[LeadGeneration] Lead previously dismissed for entity ` +
              `${candidate.entityIdentityKey}`
          );
          return { candidate, decision: { type: 'skip' } };
        }
        return {
          candidate,
          decision: { type: 'version', existingId: matchingLead.id },
        };
      }

      if (sameLeadContent) {
        return {
          candidate,
          decision: { type: 'dedup', existingId: matchingLead.id },
        };
      }
      return {
        candidate,
        decision: { type: 'version', existingId: matchingLead.id },
      };
    });
  };

  /**
   * Persist the leads to the Elasticsearch index
   * - Dedup: refresh lead (same content, update timestamp and metadata)
   * - Version / create: scripted update (create also passes upsert) so concurrent
   *   writers share one `_id` without an application-level conflict retry
   */
  const persistLeads = async ({
    executionId,
    sourceType,
    timestamp,
    dedups,
    creates,
    versions,
  }: PersistLeadsParams): Promise<void> => {
    if (dedups.length === 0 && creates.length === 0 && versions.length === 0) {
      return;
    }

    try {
      const bulkBody: object[] = [];

      for (const { existingId } of dedups) {
        logger.debug(
          `[LeadGeneration] Deduped lead ${existingId} (unchanged observations, ` +
            `executionId=${executionId})`
        );
        bulkBody.push(
          {
            update: {
              _index: indexName,
              _id: existingId,
              retry_on_conflict: LEAD_UPDATE_RETRY_ON_CONFLICT,
            },
          },
          {
            doc: {
              timestamp,
              status: 'active',
              updated_at: timestamp,
              execution_uuid: executionId,
              source_type: sourceType,
            },
          }
        );
      }

      for (const { existingId, lead } of versions) {
        const doc = leadToEsDoc(lead, executionId, sourceType);
        logger.debug(
          `[LeadGeneration] Versioning lead ${existingId} (observations changed, ` +
            `executionId=${executionId})`
        );
        bulkBody.push(
          {
            update: {
              _index: indexName,
              _id: existingId,
              retry_on_conflict: LEAD_UPDATE_RETRY_ON_CONFLICT,
            },
          },
          {
            script: {
              source: LEAD_UPDATE_SCRIPT_SOURCE,
              lang: 'painless',
              params: doc,
            },
          }
        );
      }

      for (const lead of creates) {
        const doc = leadToEsDoc(lead, executionId, sourceType);
        logger.debug(`[LeadGeneration] Creating lead ${doc.id} (executionId=${executionId})`);
        // Upsert: insert if missing; if another writer won the race, script dedups or versions.
        bulkBody.push(
          {
            update: {
              _index: indexName,
              _id: doc.id,
              retry_on_conflict: LEAD_UPDATE_RETRY_ON_CONFLICT,
            },
          },
          {
            script: {
              source: LEAD_UPDATE_SCRIPT_SOURCE,
              lang: 'painless',
              params: doc,
            },
            upsert: doc,
          }
        );
      }

      if (bulkBody.length === 0) {
        return;
      }

      const actionCount = dedups.length + creates.length + versions.length;
      const bulkResp = await esClient.bulk({ body: bulkBody, refresh: 'wait_for' });

      if (bulkResp.errors) {
        const failedItems = bulkResp.items.filter((item) => item.update?.error != null);
        const failedIds = failedItems.map((item) => item.update?._id);
        logger.error(
          `[LeadGeneration] Bulk update had ${failedItems.length}/${actionCount} failures ` +
            `(executionId=${executionId}, index=${indexName}): ${JSON.stringify(failedIds)}`
        );
        return;
      }

      logger.debug(
        `[LeadGeneration] Persisted leads to "${indexName}" (executionId=${executionId})`
      );
    } catch (e) {
      if (isEsSecurityException(e)) {
        throw e;
      }
      logger.warn(`[LeadGeneration] Failed to persist leads to "${indexName}": ${e}`);
    }
  };

  // -----------------------------------------------------------------------
  // findLeads — paginated search
  // -----------------------------------------------------------------------
  const findLeads = async ({
    page = 1,
    perPage = 20,
    sortField = 'priority',
    sortOrder = 'desc',
    status,
  }: FindLeadsParams): Promise<FindLeadsResult> => {
    const offset = (page - 1) * perPage;

    const query: estypes.QueryDslQueryContainer = status
      ? { bool: { filter: [{ term: { status } }] } }
      : { match_all: {} };

    try {
      const resp = await esClient.search({
        index: indexName,
        size: perPage,
        from: offset,
        track_total_hits: true,
        sort: [
          { [sortField]: { order: sortOrder as estypes.SortOrder } },
          { timestamp: { order: 'desc' as estypes.SortOrder } },
        ],
        query,
        ignore_unavailable: true,
      });

      const total =
        typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total?.value ?? 0;

      const leads = resp.hits.hits
        .map((hit) => hit._source)
        .filter((doc): doc is Record<string, unknown> => doc != null)
        .map(esDocToLead);

      return { leads, total, page, perPage };
    } catch (e) {
      if (isEsSecurityException(e)) {
        throw e;
      }
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (isEsIndexNotFoundException(e)) {
        logger.debug(`[LeadGeneration] Leads indices not available yet: ${errorMessage}`);
      } else {
        logger.error(`[LeadGeneration] Unable to find leads due to error: ${errorMessage}`);
      }
      return { leads: [], total: 0, page, perPage };
    }
  };

  // -----------------------------------------------------------------------
  // updateLead — partial update by doc id, bumps updated_at
  // -----------------------------------------------------------------------
  const updateLead = async (
    id: string,
    updates: Partial<Pick<Lead, 'status'>>
  ): Promise<boolean> => {
    if (updates.status === undefined) {
      return false;
    }
    try {
      const resp = await esClient.updateByQuery({
        index: indexName,
        query: { ids: { values: [id] } },
        script: {
          source: `ctx._source['status'] = params.status; ctx._source['updated_at'] = params.updatedAt;`,
          lang: 'painless',
          params: { status: updates.status, updatedAt: new Date().toISOString() },
        },
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
      return (resp.updated ?? 0) > 0;
    } catch (e) {
      logger.error(`[LeadGeneration] Error updating lead ${id}: ${e}`);
      throw e;
    }
  };

  // -----------------------------------------------------------------------
  // dismissLead — set status to 'dismissed'
  // -----------------------------------------------------------------------
  const dismissLead = async (id: string): Promise<boolean> => {
    return updateLead(id, { status: 'dismissed' });
  };

  // -----------------------------------------------------------------------
  // bulkUpdateLeads — bulk status change via updateByQuery, bumps updated_at
  // -----------------------------------------------------------------------
  const bulkUpdateLeads = async (
    ids: readonly string[],
    updates: { status: LeadStatus }
  ): Promise<number> => {
    if (ids.length === 0) return 0;

    const resp = await esClient.updateByQuery({
      index: indexName,
      query: { ids: { values: [...ids] } },
      script: {
        source: `ctx._source['status'] = params.status; ctx._source['updated_at'] = params.updatedAt;`,
        lang: 'painless',
        params: { status: updates.status, updatedAt: new Date().toISOString() },
      },
      refresh: true,
      conflicts: 'proceed',
      slices: 'auto',
      ignore_unavailable: true,
    });
    return resp.updated ?? 0;
  };

  // -----------------------------------------------------------------------
  // getStatus — engine status (cheap count query)
  // -----------------------------------------------------------------------
  const getStatus = async (options?: {
    isEnabled?: boolean;
  }): Promise<{
    isEnabled: boolean;
    indexExists: boolean;
    totalLeads: number;
    lastRun: string | null;
  }> => {
    let indexExists = false;
    let totalLeads = 0;
    let lastRun: string | null = null;

    try {
      const resp = await esClient.search({
        index: indexName,
        size: 1,
        sort: [{ timestamp: { order: 'desc' } }],
        _source: ['timestamp'],
        track_total_hits: true,
        request_cache: true,
        ignore_unavailable: true,
      });

      indexExists = true;
      totalLeads =
        typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total?.value ?? 0;

      const latestHit = resp.hits.hits[0];
      if (latestHit?._source) {
        lastRun = (latestHit._source as Record<string, unknown>).timestamp as string;
      }
    } catch (e) {
      if (isEsSecurityException(e)) {
        throw e;
      }
      logger.debug(`[LeadGeneration] Status check — indices not available: ${e}`);
    }

    return { isEnabled: options?.isEnabled ?? false, indexExists, totalLeads, lastRun };
  };

  // -----------------------------------------------------------------------
  // deleteAllLeads — used by disable route for cleanup
  // -----------------------------------------------------------------------
  const deleteAllLeads = async (): Promise<void> => {
    try {
      await esClient.deleteByQuery({
        index: indexName,
        query: { match_all: {} },
        refresh: true,
        conflicts: 'proceed',
        slices: 'auto',
        ignore_unavailable: true,
      });
      logger.info(`[LeadGeneration] Deleted all leads from space "${spaceId}"`);
    } catch (e) {
      if (isEsSecurityException(e)) {
        throw e;
      }
      logger.warn(`[LeadGeneration] Failed to delete all leads: ${e}`);
    }
  };

  return {
    classifyLeadCandidates,
    persistLeads,
    findLeads,
    updateLead,
    dismissLead,
    bulkUpdateLeads,
    getStatus,
    deleteAllLeads,
  };
};
