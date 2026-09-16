/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';

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
import { compareSignals, computeContentHash } from './lead_matching';
import type { LeadSignal } from './lead_matching';
import type { CursorPayload } from './change_cursor';
import { encodeCursor, decodeCursor } from './change_cursor';
import { createLeadIndexService } from './indices/lead_index_service';
import type { Lead as SynthesizedLead, RelatedEntity } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadDataClientDeps {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly spaceId: string;
}

interface LeadActionCandidate {
  readonly leadId: string;
  readonly observations: LeadSignal[];
}

type LeadPersistDecision =
  | { readonly type: 'refresh'; readonly existingId: string }
  | { readonly type: 'update'; readonly existingId: string; readonly allowReopen: boolean }
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
  readonly refreshes: ReadonlyArray<{
    readonly existingId: string;
    readonly topRelatedEntities: RelatedEntity[];
    readonly relatedEntityCounts: Record<string, number>;
  }>;
  readonly creates: readonly SynthesizedLead[];
  readonly updates: ReadonlyArray<{
    readonly existingId: string;
    readonly lead: SynthesizedLead;
    readonly allowReopen: boolean;
  }>;
}

interface FindLeadChangesParams {
  readonly cursor?: string;
  readonly perPage?: number;
}

interface FindLeadChangesResult {
  readonly changed: Lead[];
  readonly cursor: string | null;
  readonly hasMore: boolean;
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
  persistLeads(params: PersistLeadsParams): Promise<number>;
  findLeads(params: FindLeadsParams): Promise<FindLeadsResult>;
  findLeadChanges(params: FindLeadChangesParams): Promise<FindLeadChangesResult>;
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

interface EsRelatedEntityDoc {
  id: string;
  type: string;
  name: string;
  kinds: string[];
  risk_level?: string;
  criticality?: string;
  interacted_with_at_least?: number;
}
interface EsRelatedEntityCountDoc {
  kind: string;
  count: number;
}

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
  observations: EsObservationDoc[];
  top_related_entities: EsRelatedEntityDoc[];
  related_entity_counts: EsRelatedEntityCountDoc[];
  execution_uuid: string;
  source_type: string;
  origin: string;
  version: number;
  content_hash: string;
}

const toEsRelatedEntity = (entity: RelatedEntity): EsRelatedEntityDoc => ({
  id: entity.id,
  type: entity.type,
  name: entity.name,
  kinds: entity.kinds,
  risk_level: entity.riskLevel,
  criticality: entity.criticality,
  interacted_with_at_least: entity.interactedWithAtLeast,
});
const fromEsRelatedEntity = (doc: EsRelatedEntityDoc): RelatedEntity => ({
  id: doc.id,
  type: doc.type,
  name: doc.name,
  kinds: doc.kinds ?? [],
  riskLevel: doc.risk_level,
  criticality: doc.criticality,
  interactedWithAtLeast: doc.interacted_with_at_least,
});

const toEsRelatedEntityCounts = (counts: Record<string, number>): EsRelatedEntityCountDoc[] =>
  Object.entries(counts).map(([kind, count]) => ({ kind, count }));
const fromEsRelatedEntityCounts = (
  docs: EsRelatedEntityCountDoc[] | undefined
): Record<string, number> =>
  Object.fromEntries((docs ?? []).map(({ kind, count }) => [kind, count]));

interface ExistingLeadLookup {
  id: string;
  signals: LeadSignal[];
  version: number;
  status: LeadStatus;
}

/** Partial `_source` returned by the matching-lead mget. */
interface LeadLookupSource {
  version?: number;
  status?: string;
  observations?: Array<{ module_id: string; type: string; severity: string }>;
}

const leadToEsDoc = (
  lead: SynthesizedLead,
  executionId: string,
  sourceType: LeadGenerationMode,
  timestamp: string
): EsLeadDoc => {
  const leadId = hashEuid(lead.entity.id);
  return {
    id: leadId,
    title: lead.title,
    byline: lead.byline,
    description: lead.description,
    entity: { type: lead.entity.type, name: lead.entity.name, id: lead.entity.id },
    tags: lead.tags,
    priority: lead.priority,
    chat_recommendations: lead.chatRecommendations,
    timestamp,
    staleness: lead.staleness,
    status: 'active',
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
    top_related_entities: lead.topRelatedEntities.map(toEsRelatedEntity),
    related_entity_counts: toEsRelatedEntityCounts(lead.relatedEntityCounts),
    execution_uuid: executionId,
    source_type: sourceType,
    origin: lead.origin,
    version: 1,
    content_hash: computeContentHash({ observations: lead.observations }),
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
    entity: doc.entity as { type: string; name: string; id: string },
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
    topRelatedEntities: ((doc.top_related_entities as EsRelatedEntityDoc[] | undefined) ?? []).map(
      fromEsRelatedEntity
    ),
    relatedEntityCounts: fromEsRelatedEntityCounts(
      doc.related_entity_counts as EsRelatedEntityCountDoc[] | undefined
    ),
    executionUuid: (doc.execution_uuid as string) ?? '',
    sourceType: (doc.source_type as Lead['sourceType']) ?? 'adhoc',
    origin: (doc.origin as Lead['origin']) ?? 'observations',
    createdAt: (doc.created_at as string) ?? timestamp,
    changedAt: (doc.changed_at as string) ?? timestamp,
    version: (doc.version as number) ?? 1,
  };
};

/** ISO-8601 now on the ES node, assigned when the write is applied. */
const PAINLESS_NOW_ISO = 'Instant.ofEpochMilli(System.currentTimeMillis()).toString()';

/**
 * Painless body for lead update operations
 * - Create (`ctx.op == 'create'` via scripted_upsert): insert from params; stamp
 *   created_at and changed_at when ES applies the write
 * - Same content_hash + dismissed: noop (do not reopen)
 * - Same content_hash: refresh timestamp to indicate leads was seen again
 * - Different content_hash: replace evidence + narrative, bump version and changed_at;
 *   status only flips when `params.allow_reopen` is true (a dismissal landing between
 *   classify and persist must not be clobbered). `origin` always reflects the latest
 *   run (a lead can graduate or reclassify between observations and exploratory),
 *   unlike status which is guarded.
 * - Never touches created_at on updates
 */
const LEAD_UPDATE_SCRIPT_SOURCE = `
def now = ${PAINLESS_NOW_ISO};
if (ctx.op == 'create') {
  ctx._source.id = params.id;
  ctx._source.observations = params.observations;
  ctx._source.top_related_entities = params.top_related_entities;
  ctx._source.related_entity_counts = params.related_entity_counts;
  ctx._source.title = params.title;
  ctx._source.byline = params.byline;
  ctx._source.description = params.description;
  ctx._source.tags = params.tags;
  ctx._source.chat_recommendations = params.chat_recommendations;
  ctx._source.entity = params.entity;
  ctx._source.priority = params.priority;
  ctx._source.staleness = params.staleness;
  ctx._source.content_hash = params.content_hash;
  ctx._source.execution_uuid = params.execution_uuid;
  ctx._source.source_type = params.source_type;
  ctx._source.origin = params.origin;
  ctx._source.status = params.status;
  ctx._source.version = 1;
  ctx._source.timestamp = params.timestamp;
  ctx._source.created_at = now;
  ctx._source.changed_at = now;
} else if (ctx._source.content_hash == params.content_hash) {
  if (ctx._source.status == 'dismissed') {
    ctx.op = 'noop';
  } else {
    ctx._source.timestamp = params.timestamp;
    ctx._source.execution_uuid = params.execution_uuid;
    ctx._source.source_type = params.source_type;
    ctx._source.top_related_entities = params.top_related_entities;
    ctx._source.related_entity_counts = params.related_entity_counts;
  }
} else {
  ctx._source.id = params.id;
  ctx._source.observations = params.observations;
  ctx._source.top_related_entities = params.top_related_entities;
  ctx._source.related_entity_counts = params.related_entity_counts;
  ctx._source.title = params.title;
  ctx._source.byline = params.byline;
  ctx._source.description = params.description;
  ctx._source.tags = params.tags;
  ctx._source.chat_recommendations = params.chat_recommendations;
  ctx._source.entity = params.entity;
  ctx._source.priority = params.priority;
  ctx._source.staleness = params.staleness;
  ctx._source.content_hash = params.content_hash;
  ctx._source.execution_uuid = params.execution_uuid;
  ctx._source.source_type = params.source_type;
  ctx._source.origin = params.origin;
  ctx._source.status = params.allow_reopen ? params.status : ctx._source.status;
  ctx._source.version = (ctx._source.containsKey('version') ? (int) ctx._source.version : 0) + 1;
  ctx._source.changed_at = now;
  ctx._source.timestamp = params.timestamp;
}
`.trim();

/**
 * Refresh persist: stamp timestamp/metadata unless the lead was dismissed
 * after classify (do not reopen). Re-evaluates status on retry_on_conflict.
 */
const LEAD_REFRESH_SCRIPT_SOURCE = `
if (ctx._source.status == 'dismissed') {
  ctx.op = 'noop';
} else {
  ctx._source.timestamp = params.timestamp;
  ctx._source.execution_uuid = params.execution_uuid;
  ctx._source.source_type = params.source_type;
  ctx._source.top_related_entities = params.top_related_entities;
  ctx._source.related_entity_counts = params.related_entity_counts;
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
        _source: [
          'version',
          'status',
          'observations.module_id',
          'observations.type',
          'observations.severity',
        ],
      });

      for (const doc of resp.docs) {
        if ('found' in doc && doc.found && doc._id && doc._source) {
          matchingByKey.set(doc._id, {
            id: doc._id,
            signals: (doc._source.observations ?? []).map((obs) => ({
              moduleId: obs.module_id,
              type: obs.type,
              severity: obs.severity as LeadSignal['severity'],
            })),
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
   * Classify each candidate against existing leads using their observation set
   * - Refresh: existing non-dismissed lead with unchanged observation set
   * - Update: existing lead whose observation set escalated or decayed
   * - Skip: dismissed lead whose observation set is equal or decayed
   * - Create: no matching lead for the entity
   */
  const classifyLeadCandidates = async <T extends LeadActionCandidate>(
    candidates: ReadonlyArray<T>
  ): Promise<ReadonlyArray<LeadActionDecision<T>>> => {
    if (candidates.length === 0) {
      return [];
    }

    const matchingLeads = await findMatchingLeads(candidates.map((c) => c.leadId));

    return candidates.map((candidate) => {
      const matchingLead = matchingLeads.get(candidate.leadId);
      if (!matchingLead) {
        return { candidate, decision: { type: 'create' } };
      }

      const observationsDelta = compareSignals(candidate.observations, matchingLead.signals);

      if (matchingLead.status === 'dismissed') {
        if (observationsDelta !== 'escalated') {
          logger.debug(`[LeadGeneration] Lead previously dismissed for entity ${candidate.leadId}`);
          return { candidate, decision: { type: 'skip' } };
        }

        // Reopen the lead because the observation set escalated
        return {
          candidate,
          decision: { type: 'update', existingId: matchingLead.id, allowReopen: true },
        };
      }

      if (observationsDelta === 'equal') {
        return {
          candidate,
          decision: { type: 'refresh', existingId: matchingLead.id },
        };
      }

      // Observation set changed; overwrite evidence. allowReopen is false to prevent reopening the lead if it was dismissed between classify and persist.
      return {
        candidate,
        decision: { type: 'update', existingId: matchingLead.id, allowReopen: false },
      };
    });
  };

  /**
   * Persist the leads to the Elasticsearch index
   * - Refresh: scripted timestamp/metadata write (same content); noops if dismissed since classify
   * - Update / create: scripted update (create also passes upsert + scripted_upsert)
   *   so concurrent writers share one `_id` and changed_at is stamped at apply time
   */
  const persistLeads = async ({
    executionId,
    sourceType,
    timestamp,
    refreshes,
    creates,
    updates,
  }: PersistLeadsParams): Promise<number> => {
    const actionCount = refreshes.length + creates.length + updates.length;
    if (actionCount === 0) {
      return 0;
    }

    try {
      // Adhoc generate does not go through enable, so persist must reconcile the
      // index mapping on every write. createIndex is idempotent (exists -> putMapping)
      // and picks up new fields such as origin on pre-existing strict indices.
      const indexService = createLeadIndexService({ esClient, logger, spaceId });
      await indexService.createIndex();

      const bulkBody: object[] = [];

      for (const { existingId, topRelatedEntities, relatedEntityCounts } of refreshes) {
        logger.debug(
          `[LeadGeneration] Refreshing lead ${existingId} (unchanged signal set, ` +
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
              source: LEAD_REFRESH_SCRIPT_SOURCE,
              lang: 'painless',
              params: {
                timestamp,
                execution_uuid: executionId,
                source_type: sourceType,
                top_related_entities: topRelatedEntities.map(toEsRelatedEntity),
                related_entity_counts: toEsRelatedEntityCounts(relatedEntityCounts),
              },
            },
          }
        );
      }

      for (const { existingId, lead, allowReopen } of updates) {
        const doc = leadToEsDoc(lead, executionId, sourceType, timestamp);
        logger.debug(
          `[LeadGeneration] Updating lead ${existingId} (signal set changed, ` +
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
              params: { ...doc, allow_reopen: allowReopen },
            },
          }
        );
      }

      for (const lead of creates) {
        const doc = leadToEsDoc(lead, executionId, sourceType, timestamp);
        logger.debug(`[LeadGeneration] Creating lead ${doc.id} (executionId=${executionId})`);
        // Upsert: insert if missing; if another writer won the race, script refreshes or updates.
        // allow_reopen is unused on the create branch; it only guards the fallthrough
        // else-branch when a concurrent writer already created the document.
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
              params: { ...doc, allow_reopen: false },
            },
            upsert: {}, // uses the script to set created_at and changed_at on apply time
            scripted_upsert: true,
          }
        );
      }

      const bulkResp = await esClient.bulk({ body: bulkBody, refresh: 'wait_for' });

      if (bulkResp.errors) {
        const failedItems = bulkResp.items.filter((item) => item.update?.error != null);
        const failedIds = failedItems.map((item) => item.update?._id);
        logger.error(
          `[LeadGeneration] Bulk update had ${failedItems.length}/${actionCount} failures ` +
            `(executionId=${executionId}, index=${indexName}): ${JSON.stringify(failedIds)}`
        );
        return failedItems.length;
      }

      logger.debug(
        `[LeadGeneration] Persisted leads to "${indexName}" (executionId=${executionId})`
      );
      return 0;
    } catch (e) {
      if (isEsSecurityException(e)) {
        throw e;
      }
      logger.warn(`[LeadGeneration] Failed to persist leads to "${indexName}": ${e}`);
      return actionCount;
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

  const CHANGE_FEED_DEFAULT_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
  /**
   * Find leads that have changed since the cursor, or the last 7 days if no cursor.
   */
  const findLeadChanges = async ({
    cursor: encodedCursor,
    perPage = 100,
  }: FindLeadChangesParams): Promise<FindLeadChangesResult> => {
    const now = Date.now();

    let cursorPayload: CursorPayload | undefined;
    if (encodedCursor) {
      cursorPayload = decodeCursor(encodedCursor);
    }

    const buildCursor = (hit: estypes.SearchHit): string => {
      const changedAt = hit.sort?.[0];
      const docId = hit.sort?.[1];
      if (changedAt == null || docId == null) {
        throw new Error('Lead change hit missing sort values required for the cursor');
      }
      return encodeCursor(Number(changedAt), String(docId));
    };

    try {
      // Without a cursor, returns leads changed in the last 7 days.
      // With a cursor, returns all leads changed since the cursor, ignoring CHANGE_FEED_DEFAULT_LOOKBACK_MS.
      const gteMs = cursorPayload ? cursorPayload.changedAt : now - CHANGE_FEED_DEFAULT_LOOKBACK_MS;
      const rangeFilter: Record<string, string> = {
        gte: new Date(gteMs).toISOString(),
        lte: new Date(now).toISOString(),
      };

      const searchReq: estypes.SearchRequest = {
        index: indexName,
        size: perPage + 1,
        sort: [{ changed_at: { order: 'asc' } }, { id: { order: 'asc' } }],
        query: { range: { changed_at: rangeFilter } },
        ignore_unavailable: true,
      };
      if (cursorPayload) {
        searchReq.search_after = [cursorPayload.changedAt, cursorPayload.docId];
      }

      const resp = await esClient.search(searchReq);
      const hits = resp.hits.hits;
      const hasMore = hits.length > perPage;
      const pageHits = hasMore ? hits.slice(0, perPage) : hits;

      const changed = pageHits
        .map((hit) => hit._source)
        .filter((doc): doc is Record<string, unknown> => doc != null)
        .map(esDocToLead);

      const cursor =
        pageHits.length > 0 ? buildCursor(pageHits[pageHits.length - 1]) : encodedCursor ?? null;

      return { changed, cursor, hasMore };
    } catch (e) {
      if (isEsSecurityException(e)) throw e;
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (isEsIndexNotFoundException(e)) {
        logger.debug(`[LeadGeneration] Lead changes index not available: ${errorMessage}`);
        return { changed: [], cursor: encodedCursor ?? null, hasMore: false };
      }
      logger.error(`[LeadGeneration] Unable to fetch lead changes: ${errorMessage}`);
      throw e;
    }
  };

  // -----------------------------------------------------------------------
  // updateLead — partial update by doc id, bumps changed_at
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
          source: `ctx._source['status'] = params.status; ctx._source['changed_at'] = ${PAINLESS_NOW_ISO};`,
          lang: 'painless',
          params: { status: updates.status },
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
  // bulkUpdateLeads — bulk status change via updateByQuery, bumps changed_at
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
        source: `ctx._source['status'] = params.status; ctx._source['changed_at'] = ${PAINLESS_NOW_ISO};`,
        lang: 'painless',
        params: { status: updates.status },
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
    findLeadChanges,
    updateLead,
    dismissLead,
    bulkUpdateLeads,
    getStatus,
    deleteAllLeads,
  };
};
