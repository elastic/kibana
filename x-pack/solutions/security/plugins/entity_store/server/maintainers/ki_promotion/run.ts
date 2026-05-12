/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { getLatestEntitiesIndexName } from '../../../common';
import { getEuidFromObject } from '../../../common/domain/euid/memory';
import { deriveGroupingField } from '../../domain/definitions/ki_definition_builder';
import { bulkUpdateEntityDocs } from '../../infra/elasticsearch/resolution';
import type { EntityStoreGlobalStateClient } from '../../domain/saved_objects';
import type { KiPromotionLastRun } from './types';

/**
 * Routing table from human-readable `entity.type` labels (as set by KI
 * extraction in `ki_definition_builder.ts`) to the static engine the
 * `ki-promotion` maintainer is allowed to migrate them into.
 *
 * Intentionally excluded:
 *  - `Identity` — the user tier is deferred to v2 of the KI promotion
 *    feature (see strategy doc, Section 8). Routing user-tier entities
 *    requires the user-engine's IDP-aware identity model, which the
 *    plain Streams-extractor input does not carry today.
 *  - Any unmapped subtype label (e.g. `database`, `cache`) — these are
 *    informational classifications that have no static engine target.
 */
const ENTITY_TYPE_LABEL_TO_TARGET_ENGINE: Record<string, 'host' | 'service'> = {
  Host: 'host',
  Service: 'service',
};

/**
 * Allowed grouping fields per target engine for the ECS-known kill switch
 * (decision E of the plan). The maintainer refuses to promote when the
 * underlying KI feature's `groupingField` is not in this set — the
 * false-positive risk of admitting an arbitrary stream's `org.team` as
 * a `host.id` source is severe and not worth a config knob.
 *
 * These mirror the `documentsFilter` invariants on the static `host` and
 * `service` engines respectively; see `common/domain/definitions/host.ts`
 * and `service.ts`.
 */
const ECS_GROUPING_FIELDS_BY_ENGINE: Record<'host' | 'service', readonly string[]> = {
  host: ['host.id', 'host.name', 'host.hostname'],
  service: ['service.name'],
};

const SEARCH_PAGE_SIZE = 1000;

export interface KiPromotionRunDeps {
  reader: StreamsKnowledgeIndicatorsReader;
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
  abortController: AbortController;
  globalStateClient: EntityStoreGlobalStateClient;
}

interface PromotionCandidateDoc {
  docId: string;
  entityId: string;
  entityType: string;
  entitySource: string[];
  flatDoc: Record<string, unknown>;
  hostId?: string;
  hostName?: string;
  hostHostname?: string;
  serviceName?: string;
}

interface DemotionCandidateDoc {
  docId: string;
  entityEngineType: 'host' | 'service';
  entitySource: string[];
  previousId: string | undefined;
  flatDoc: Record<string, unknown>;
  hostId?: string;
  hostName?: string;
  hostHostname?: string;
  serviceName?: string;
}

interface BulkUpdate {
  docId: string;
  doc: Record<string, unknown>;
}

/**
 * One pass of the KI promotion maintainer.
 *
 * Behavior:
 *
 *  1. Threshold gate. The maintainer is a runtime no-op when either
 *     `promoteToTypedThreshold` is `null` OR `promotedEntityTypes` is
 *     empty. The gate is checked before any ES traffic — a misconfigured
 *     tenant pays nothing for the maintainer being registered.
 *
 *  2. Feature read. Fetches every entity feature at-or-above the promote
 *     threshold via the streams plugin's KI reader. From this set the
 *     maintainer derives two structures used later:
 *     - `aboveThresholdLineageTags`: the canonical lineage tag set
 *       (`stream:<streamName>:<subtype>`) currently considered eligible
 *       for promotion.
 *     - `featureGroupingFieldByLineage`: the grouping field per lineage,
 *       recomputed via the SAME `deriveGroupingField` used by extraction.
 *       Recomputing (rather than reading from the doc) makes the
 *       maintainer correct even when the same lineage's KI feature
 *       changes its `filter` shape between runs.
 *
 *  3. Promotion pass. Pages through `generic`-typed entities matching
 *     `entity.source` wildcard `stream:*:*` AND `entity.type` in the
 *     allowed-label set. For each candidate the maintainer applies two
 *     gates IN ORDER:
 *     - Identity-field gate (decision E + draft constraint 6): the doc
 *       carries a non-empty value in one of the target engine's allowed
 *       identity fields AND the underlying feature's grouping field is
 *       one of the ECS-known fields for that target engine.
 *     - Threshold gate: at least one of the doc's `entity.source`
 *       lineage tags is in `aboveThresholdLineageTags`. A doc that
 *       fails this gate is below threshold today; if it was previously
 *       promoted it will be picked up by the demote pass.
 *
 *     On all-passes, the maintainer recomputes the target EUID via
 *     `getEuidFromObject(targetEngine, doc)` from `common/domain/euid/
 *     memory.ts` and stages a partial update that retypes the doc.
 *
 *  4. Demotion pass. Pages through `host`/`service`-typed entities with
 *     `entity.confidence == 'low'` AND `entity.source` wildcard
 *     `stream:*:*`. A doc is left in place iff at least one of its
 *     lineage tags is still above threshold AND the identity-field gate
 *     for its current target engine still passes; otherwise the doc is
 *     demoted by restoring its `entity.previous_id`, clearing
 *     `entity.confidence` and `entity.previous_id` to `null`, and
 *     resetting `entity.EngineMetadata.Type` to `'generic'`. `entity.type`
 *     and `entity.sub_type` are intentionally NOT touched on demote
 *     (draft Section 3.7): extraction will re-populate them anyway, and
 *     leaving them allows analyst-facing queries to keep filtering on
 *     them across the demote.
 *
 *  5. Bulk write. Promotes and demotes flow through the SAME
 *     `bulkUpdateEntityDocs` call so the retry-on-conflict semantics
 *     defined there cover both. Partial item failures are counted and
 *     logged but not thrown — the next run re-evaluates the same
 *     candidates and will issue another bulk attempt.
 *
 * Replace-per-run invariant: this maintainer never accumulates state
 * across runs in the stored doc beyond `entity.previous_id`. Promotion
 * and demotion are deterministically derived from the current
 * (extracted entity, KI feature, identity field) triple at run time.
 */
export const runKiPromotion = async (
  deps: KiPromotionRunDeps
): Promise<KiPromotionLastRun> => {
  const { reader, esClient, logger, namespace, abortController, globalStateClient } = deps;

  const globalState = await globalStateClient.findOrThrow();
  const { promoteToTypedThreshold, promotedEntityTypes } = globalState.knowledgeIndicators;

  if (
    promoteToTypedThreshold == null ||
    !Array.isArray(promotedEntityTypes) ||
    promotedEntityTypes.length === 0
  ) {
    logger.debug(
      `KI promotion: skipped (promoteToTypedThreshold=${String(
        promoteToTypedThreshold
      )}, promotedEntityTypes=${JSON.stringify(promotedEntityTypes)})`
    );
    return { ...EMPTY_RESULT, skippedThresholdMisconfigured: 1 };
  }

  // Allowed labels are intersected with the operator's allow-list so that
  // a single tenant promoting only `service` doesn't pay for `Host`
  // candidate pagination. The mapping is engine-direction, not label-
  // direction, so we walk the label keys and filter by their mapped engine.
  const allowedLabels = Object.keys(ENTITY_TYPE_LABEL_TO_TARGET_ENGINE).filter((label) =>
    promotedEntityTypes.includes(ENTITY_TYPE_LABEL_TO_TARGET_ENGINE[label])
  );
  if (allowedLabels.length === 0) {
    // promotedEntityTypes is set but contains no engine reachable via
    // our routing table (would only happen if the enum drifts). Same
    // semantics as the threshold gate: no-op without ES traffic.
    return { ...EMPTY_RESULT, skippedThresholdMisconfigured: 1 };
  }

  const features = await reader.listEntityFeatures({ minConfidence: promoteToTypedThreshold });
  if (abortController.signal.aborted) return EMPTY_RESULT;

  const aboveThresholdLineageTags = new Set<string>();
  const featureGroupingFieldByLineage = new Map<string, string>();
  // Group features by lineage so `deriveGroupingField` sees the same
  // (stream, subtype) feature set that extraction would have seen.
  const featuresByLineage = groupFeaturesByLineage(features);
  for (const [lineageTag, groupedFeatures] of featuresByLineage) {
    aboveThresholdLineageTags.add(lineageTag);
    featureGroupingFieldByLineage.set(lineageTag, deriveGroupingField(groupedFeatures));
  }

  const index = getLatestEntitiesIndexName(namespace);
  const result: KiPromotionLastRun = { ...EMPTY_RESULT };
  const pendingUpdates: BulkUpdate[] = [];

  await processPromotionCandidates({
    esClient,
    index,
    abortController,
    allowedLabels,
    featureGroupingFieldByLineage,
    aboveThresholdLineageTags,
    promotedEntityTypes,
    logger,
    onCandidate: (candidate) => {
      result.candidatesEvaluated += 1;

      const targetEngine = ENTITY_TYPE_LABEL_TO_TARGET_ENGINE[candidate.entityType];
      // Eligibility (entity.type) was already filtered by the ES query,
      // but the JS-side guard makes the routing explicit and safe against
      // a future change to the search filter shape.
      if (!targetEngine || !promotedEntityTypes.includes(targetEngine)) return;

      const matchingLineageTag = findMatchingLineageTag(
        candidate.entitySource,
        aboveThresholdLineageTags
      );
      if (matchingLineageTag === undefined) {
        // Doc is tagged with a stream lineage but no feature for that
        // lineage is above threshold today. The doc will be re-evaluated
        // for demotion if it was previously promoted; for now, skip.
        result.skippedLowConfidenceFeature += 1;
        return;
      }

      const groupingField = featureGroupingFieldByLineage.get(matchingLineageTag);
      const ecsGroupingFields = ECS_GROUPING_FIELDS_BY_ENGINE[targetEngine];
      if (groupingField === undefined || !ecsGroupingFields.includes(groupingField)) {
        result.skippedNonEcsGroupingField += 1;
        return;
      }

      if (!docHasIdentityFieldFor(targetEngine, candidate)) {
        result.skippedMissingIdentityField += 1;
        return;
      }

      const newEuid = getEuidFromObject(targetEngine, candidate.flatDoc);
      if (!newEuid) {
        // Defense-in-depth: `docHasIdentityFieldFor` already validated
        // a non-empty identity field, but EUID composition might still
        // fail on a malformed doc (e.g. nested vs flat shape mismatch).
        result.skippedMissingIdentityField += 1;
        return;
      }

      pendingUpdates.push({
        docId: candidate.docId,
        doc: {
          'entity.EngineMetadata.Type': targetEngine,
          'entity.id': newEuid,
          'entity.confidence': 'low',
          'entity.previous_id': candidate.entityId,
        },
      });
      result.promoted += 1;
    },
  });

  if (abortController.signal.aborted) return result;

  await processDemotionCandidates({
    esClient,
    index,
    abortController,
    promotedEntityTypes,
    logger,
    onCandidate: (candidate) => {
      result.candidatesEvaluated += 1;

      const matchingLineageTag = findMatchingLineageTag(
        candidate.entitySource,
        aboveThresholdLineageTags
      );

      if (matchingLineageTag !== undefined) {
        const groupingField = featureGroupingFieldByLineage.get(matchingLineageTag);
        const ecsGroupingFields = ECS_GROUPING_FIELDS_BY_ENGINE[candidate.entityEngineType];
        const stillEligibleByGroupingField =
          groupingField !== undefined && ecsGroupingFields.includes(groupingField);
        const stillEligibleByIdentity = docHasIdentityFieldFor(
          candidate.entityEngineType,
          candidate
        );
        if (stillEligibleByGroupingField && stillEligibleByIdentity) {
          // Feature is still above threshold AND identity gate still
          // passes. Leave the promotion in place.
          return;
        }
      }

      if (!candidate.previousId) {
        // Defensive: previously-promoted docs without `previous_id`
        // cannot be safely demoted (we'd lose the generic EUID). Skip
        // and rely on the next promotion pass to set the field correctly.
        logger.warn(
          `KI promotion: cannot demote doc ${candidate.docId} (missing entity.previous_id); skipping`
        );
        return;
      }

      pendingUpdates.push({
        docId: candidate.docId,
        doc: {
          'entity.EngineMetadata.Type': 'generic',
          'entity.id': candidate.previousId,
          // Cleared via partial update — see `bulkUpdateEntityDocs` note
          // in `infra/elasticsearch/resolution.ts`. ES treats `null` in a
          // partial `doc` as "set the field to null", which we want for
          // these keyword fields.
          'entity.confidence': null,
          'entity.previous_id': null,
        },
      });
      result.demoted += 1;
    },
  });

  if (pendingUpdates.length === 0) {
    logger.debug('KI promotion: no eligible candidates this run');
    return result;
  }

  logger.info(
    `KI promotion: writing ${result.promoted} promotion(s) and ${result.demoted} demotion(s)`
  );
  const bulkResult = await bulkUpdateEntityDocs(esClient, { index, updates: pendingUpdates });
  if (bulkResult.errors) {
    const failureCount = bulkResult.items.filter(
      (item) => Object.values(item)[0]?.error !== undefined
    ).length;
    result.bulkUpdateErrors += failureCount;
    logger.warn(
      `KI promotion: bulk update completed with ${failureCount} item failure(s); will retry on next run`
    );
  }

  return result;
};

const EMPTY_RESULT: KiPromotionLastRun = {
  candidatesEvaluated: 0,
  promoted: 0,
  demoted: 0,
  skippedMissingIdentityField: 0,
  skippedNonEcsGroupingField: 0,
  skippedThresholdMisconfigured: 0,
  skippedLowConfidenceFeature: 0,
  bulkUpdateErrors: 0,
};

const groupFeaturesByLineage = (features: Feature[]): Map<string, Feature[]> => {
  const byLineage = new Map<string, Feature[]>();
  for (const feature of features) {
    const subtype = typeof feature.subtype === 'string' ? feature.subtype : '';
    if (subtype.length === 0) continue;
    const lineageTag = `stream:${feature.stream_name}:${subtype}`;
    const existing = byLineage.get(lineageTag);
    if (existing) {
      existing.push(feature);
    } else {
      byLineage.set(lineageTag, [feature]);
    }
  }
  return byLineage;
};

const findMatchingLineageTag = (
  entitySource: string[],
  aboveThresholdLineageTags: Set<string>
): string | undefined => {
  for (const tag of entitySource) {
    if (aboveThresholdLineageTags.has(tag)) return tag;
  }
  return undefined;
};

const docHasIdentityFieldFor = (
  targetEngine: 'host' | 'service',
  doc: { hostId?: string; hostName?: string; hostHostname?: string; serviceName?: string }
): boolean => {
  if (targetEngine === 'host') {
    return Boolean(doc.hostId || doc.hostName || doc.hostHostname);
  }
  return Boolean(doc.serviceName);
};

/**
 * Pages through generic entities that are extraction-derived and
 * whose `entity.type` matches one of the allowed labels. `search_after`
 * on `entity.id` provides deterministic, stateless pagination — the
 * maintainer never persists a cursor because the next run will see a
 * different (post-extraction) candidate set anyway.
 */
const processPromotionCandidates = async (params: {
  esClient: ElasticsearchClient;
  index: string;
  abortController: AbortController;
  allowedLabels: string[];
  featureGroupingFieldByLineage: Map<string, string>;
  aboveThresholdLineageTags: Set<string>;
  promotedEntityTypes: ReadonlyArray<'host' | 'service'>;
  logger: Logger;
  onCandidate: (candidate: PromotionCandidateDoc) => void;
}): Promise<void> => {
  const { esClient, index, abortController, allowedLabels, onCandidate } = params;

  let searchAfter: [string] | undefined;
  while (!abortController.signal.aborted) {
    const response = (await esClient.search({
      index,
      size: SEARCH_PAGE_SIZE,
      sort: [{ 'entity.id': { order: 'asc' } }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
      _source: [
        'entity.id',
        'entity.type',
        'entity.source',
        'entity.EngineMetadata.Type',
        'host.id',
        'host.name',
        'host.hostname',
        'service.name',
      ],
      query: {
        bool: {
          filter: [
            { term: { 'entity.EngineMetadata.Type': 'generic' } },
            { terms: { 'entity.type': allowedLabels } },
            { wildcard: { 'entity.source': 'stream:*:*' } },
          ],
        },
      },
    })) as SearchResponse<EntityDocSource>;

    const hits = response.hits.hits;
    if (hits.length === 0) return;

    for (const hit of hits) {
      if (abortController.signal.aborted) return;
      const candidate = toPromotionCandidate(hit);
      if (!candidate) continue;
      onCandidate(candidate);
    }

    if (hits.length < SEARCH_PAGE_SIZE) return;
    const lastHit = hits[hits.length - 1];
    const cursor = lastHit.sort?.[0];
    if (typeof cursor !== 'string') return;
    searchAfter = [cursor];
  }
};

/**
 * Pages through previously-promoted entities (currently typed as one of
 * `host` / `service`, marked with `entity.confidence: 'low'`, carrying a
 * stream lineage). Same pagination model as `processPromotionCandidates`.
 */
const processDemotionCandidates = async (params: {
  esClient: ElasticsearchClient;
  index: string;
  abortController: AbortController;
  promotedEntityTypes: ReadonlyArray<'host' | 'service'>;
  logger: Logger;
  onCandidate: (candidate: DemotionCandidateDoc) => void;
}): Promise<void> => {
  const { esClient, index, abortController, promotedEntityTypes, onCandidate } = params;

  let searchAfter: [string] | undefined;
  while (!abortController.signal.aborted) {
    const response = (await esClient.search({
      index,
      size: SEARCH_PAGE_SIZE,
      sort: [{ 'entity.id': { order: 'asc' } }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
      _source: [
        'entity.id',
        'entity.type',
        'entity.source',
        'entity.confidence',
        'entity.previous_id',
        'entity.EngineMetadata.Type',
        'host.id',
        'host.name',
        'host.hostname',
        'service.name',
      ],
      query: {
        bool: {
          filter: [
            { terms: { 'entity.EngineMetadata.Type': [...promotedEntityTypes] } },
            { term: { 'entity.confidence': 'low' } },
            { wildcard: { 'entity.source': 'stream:*:*' } },
          ],
        },
      },
    })) as SearchResponse<EntityDocSource>;

    const hits = response.hits.hits;
    if (hits.length === 0) return;

    for (const hit of hits) {
      if (abortController.signal.aborted) return;
      const candidate = toDemotionCandidate(hit);
      if (!candidate) continue;
      onCandidate(candidate);
    }

    if (hits.length < SEARCH_PAGE_SIZE) return;
    const lastHit = hits[hits.length - 1];
    const cursor = lastHit.sort?.[0];
    if (typeof cursor !== 'string') return;
    searchAfter = [cursor];
  }
};

interface EntityDocSource {
  entity?: {
    id?: string;
    type?: string;
    source?: string[];
    confidence?: string;
    previous_id?: string;
    EngineMetadata?: { Type?: string };
  };
  host?: { id?: string; name?: string; hostname?: string };
  service?: { name?: string };
}

const toPromotionCandidate = (hit: {
  _id?: string;
  _source?: EntityDocSource;
}): PromotionCandidateDoc | undefined => {
  const docId = hit._id;
  const src = hit._source;
  if (!docId || !src?.entity?.id || typeof src.entity.type !== 'string') {
    return undefined;
  }
  const entitySource = Array.isArray(src.entity.source) ? src.entity.source : [];
  return {
    docId,
    entityId: src.entity.id,
    entityType: src.entity.type,
    entitySource,
    flatDoc: toFlatDoc(src),
    hostId: src.host?.id,
    hostName: src.host?.name,
    hostHostname: src.host?.hostname,
    serviceName: src.service?.name,
  };
};

const toDemotionCandidate = (hit: {
  _id?: string;
  _source?: EntityDocSource;
}): DemotionCandidateDoc | undefined => {
  const docId = hit._id;
  const src = hit._source;
  const engineType = src?.entity?.EngineMetadata?.Type;
  if (
    !docId ||
    !src?.entity ||
    (engineType !== 'host' && engineType !== 'service')
  ) {
    return undefined;
  }
  const entitySource = Array.isArray(src.entity.source) ? src.entity.source : [];
  return {
    docId,
    entityEngineType: engineType,
    entitySource,
    previousId: src.entity.previous_id,
    flatDoc: toFlatDoc(src),
    hostId: src.host?.id,
    hostName: src.host?.name,
    hostHostname: src.host?.hostname,
    serviceName: src.service?.name,
  };
};

/**
 * Flattens a hit's `_source` into the shape `getEuidFromObject` expects.
 * The function works with both nested (`{ host: { id: '...' } }`) and
 * flat (`{ 'host.id': '...' }`) shapes, but giving it BOTH at once is
 * the most resilient choice in the face of dynamic vs explicit mappings.
 */
const toFlatDoc = (src: EntityDocSource): Record<string, unknown> => {
  const flat: Record<string, unknown> = { ...src };
  if (src.host) {
    if (src.host.id !== undefined) flat['host.id'] = src.host.id;
    if (src.host.name !== undefined) flat['host.name'] = src.host.name;
    if (src.host.hostname !== undefined) flat['host.hostname'] = src.host.hostname;
  }
  if (src.service?.name !== undefined) flat['service.name'] = src.service.name;
  return flat;
};
