/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BulkResponse, SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { getLatestEntitiesIndexName } from '../../../common';
import { getFieldValue } from '../../../common/domain/euid/commons';
import { bulkUpdateEntityDocs } from '../../infra/elasticsearch/resolution';
import { ResolutionClient } from '../../domain/resolution/resolution_client';
import {
  CURRENT_EMBED_SOURCE_VERSION,
  DEFAULT_EMBEDDED_AT_FIELD,
  DEFAULT_EMBEDDING_FIELD,
  DEFAULT_EMBEDDING_SOURCE_FIELD,
  buildIdentityString,
  embedBatch,
  type IdentityFields,
} from './embed';
import { collectKnnCandidates, type KnnCandidate } from './knn';
import { isRoleAccount } from './role_account_guard';
import { verifyInferenceEndpoint } from './setup';
import type { EmbeddingResolutionState, EntityToEmbed } from './types';

const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';
const ENTITY_TYPE = 'user';
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const BY_EMBEDDING_RESOLVED_TO_FIELD = 'entity.relationships.resolution.by_embedding.resolved_to';
const FIRST_SEEN_FIELD = 'entity.lifecycle.first_seen';
const ENTITY_ID_FIELD = 'entity.id';

/**
 * Per-page batch size. Keeps the inference call small enough to stay under
 * provider request budgets while still amortising the per-request overhead.
 */
export const PAGE_SIZE = 100;

/** Default cosine-similarity threshold for embedding-driven linking. Per design §9. */
export const DEFAULT_LINK_THRESHOLD = 0.85;
/** Default `k` for the kNN search. Per design §7. */
export const DEFAULT_LINK_K = 10;
/** Default `num_candidates` for the kNN search. Per design §7. */
export const DEFAULT_LINK_NUM_CANDIDATES = 100;

export interface RunDeps {
  state: EmbeddingResolutionState;
  namespace: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  inferenceId: string;
  expectedDims: number;
  abortController: AbortController;
  /**
   * Phase 3 toggle — when true, after a successful embed each entity's
   * neighbourhood is searched (kNN) and the top above-threshold candidate is
   * linked via {@link ResolutionClient.linkEntities} with provenance. When
   * false (Phase 2 default), the run only embeds. Controlled at registration
   * time via `entityAnalyticsEmbeddingResolutionEnabled`; see Phase 3g for
   * the full flag wiring.
   */
  linkingEnabled?: boolean;
  /** Optional override of {@link DEFAULT_LINK_THRESHOLD}. */
  threshold?: number;
  /** Optional override of {@link DEFAULT_LINK_K}. */
  k?: number;
  /** Optional override of {@link DEFAULT_LINK_NUM_CANDIDATES}. */
  numCandidates?: number;
  /**
   * Optional pre-built {@link ResolutionClient}. When omitted, the run loop
   * constructs one from `esClient` + `logger` + `namespace`. Tests inject a
   * jest mock via this hook so they don't have to fixture the full client.
   */
  resolutionClient?: ResolutionClient;
  /**
   * ES field path for the dense_vector. Defaults to
   * {@link DEFAULT_EMBEDDING_FIELD} (`entity.resolution.embedding`) for the
   * primary slot. Additional slots pass a namespaced path such as
   * `entity.resolution.embeddings.e5_384`.
   */
  embeddingField?: string;
  /**
   * ES field path for the source-version tag. Defaults to
   * {@link DEFAULT_EMBEDDING_SOURCE_FIELD}. Must be the `<embeddingField>_source`
   * sibling when using a named slot.
   */
  embeddingSourceField?: string;
  /**
   * ES field path for the embedded-at timestamp. Defaults to
   * {@link DEFAULT_EMBEDDED_AT_FIELD}.
   */
  embeddedAtField?: string;
  /**
   * Parallel rule + embedding entity resolution toggle. When true:
   * - the "already-resolved" filter switches from the legacy single slot to
   *   `entity.relationships.resolution.by_embedding.resolved_to` so an
   *   entity already linked by the rule maintainer still flows through the
   *   embedding maintainer for a second opinion;
   * - links are stamped via `linkEntities({ source: 'embedding' })` so the
   *   merge layer can compute `effective_to` / `divergent` against the
   *   existing per-source verdicts.
   * When false (default), behavior is identical to the pre-RFC fallback
   * implementation. Wired from the `entityAnalyticsParallelResolution`
   * experimental flag in the security_solution plugin.
   */
  parallelResolutionEnabled?: boolean;
}

/** Per-run link-step counters layered on top of the embed counters. */
interface LinkRunMetrics {
  linked: number;
  skippedAmbiguous: number;
  skippedBelowThreshold: number;
  skippedRoleAccount: number;
}

/**
 * Phase 2 of er-v2-embedding-resolution-design.md — embed unresolved user
 * entities; do NOT link them. Mirrors the shape of automated_resolution/run.ts
 * (verify → collect → process → watermark) so failure / abort / retry semantics
 * stay consistent across both maintainers.
 */
export async function runEmbeddingResolution(deps: RunDeps): Promise<EmbeddingResolutionState> {
  const { state, namespace, esClient, logger, inferenceId, expectedDims, abortController } = deps;

  if (abortController.signal.aborted) {
    logger.debug('Aborted before start');
    return state;
  }

  // Step 0: Confirm the inference endpoint is reachable.
  const verification = await verifyInferenceEndpoint({
    esClient,
    inferenceId,
    expectedDims,
    logger,
  });
  if (!verification.ready) {
    return {
      ...state,
      lastRun: {
        embedded: 0,
        failed: 0,
        linked: 0,
        skippedAmbiguous: 0,
        skippedBelowThreshold: 0,
        skippedRoleAccount: 0,
      },
    };
  }

  // Step 0b: If the on-disk recipe version changed, treat as a full re-scan.
  const effectiveWatermark =
    state.embedSourceVersion === CURRENT_EMBED_SOURCE_VERSION ? state.lastProcessedTimestamp : null;
  if (effectiveWatermark === null && state.embedSourceVersion !== CURRENT_EMBED_SOURCE_VERSION) {
    logger.info(
      `embedSourceVersion bumped from '${state.embedSourceVersion}' to ` +
        `'${CURRENT_EMBED_SOURCE_VERSION}' — resetting watermark to re-embed every entity.`
    );
  }

  const index = getLatestEntitiesIndexName(namespace);
  const linkingEnabled = deps.linkingEnabled === true;
  const threshold = deps.threshold ?? DEFAULT_LINK_THRESHOLD;
  const k = deps.k ?? DEFAULT_LINK_K;
  const numCandidates = deps.numCandidates ?? DEFAULT_LINK_NUM_CANDIDATES;
  const resolutionClient =
    deps.resolutionClient ?? new ResolutionClient({ logger, esClient, namespace });
  const embeddingField = deps.embeddingField ?? DEFAULT_EMBEDDING_FIELD;
  const embeddingSourceField = deps.embeddingSourceField ?? DEFAULT_EMBEDDING_SOURCE_FIELD;
  const embeddedAtField = deps.embeddedAtField ?? DEFAULT_EMBEDDED_AT_FIELD;
  const parallelResolutionEnabled = deps.parallelResolutionEnabled === true;
  // In parallel mode, the embedding maintainer ignores the legacy single
  // slot and only skips entities already linked by *its own* source. That
  // means a rule-resolved entity still flows through to get a "second
  // opinion" recorded on `by_embedding.*`, which the merge layer turns into
  // an `effective_to` / `divergent` pair.
  const resolvedToFilterField = parallelResolutionEnabled
    ? BY_EMBEDDING_RESOLVED_TO_FIELD
    : RESOLVED_TO_FIELD;

  // Steps 1..N: page through unresolved entities, embed + write per page.
  let embedded = 0;
  let failed = 0;
  const linkMetrics: LinkRunMetrics = {
    linked: 0,
    skippedAmbiguous: 0,
    skippedBelowThreshold: 0,
    skippedRoleAccount: 0,
  };
  let maxTimestamp = effectiveWatermark ?? '';
  let searchAfter: Array<string | number> | undefined;

  for (;;) {
    if (abortController.signal.aborted) {
      logger.debug('Aborted before next search page');
      break;
    }

    const response = await searchUnresolvedToEmbed({
      esClient,
      index,
      watermark: effectiveWatermark,
      searchAfter,
      embeddingField,
      embeddingSourceField,
      resolvedToField: resolvedToFilterField,
    });

    const hits = response.hits.hits;
    if (hits.length === 0) {
      break;
    }

    if (abortController.signal.aborted) {
      logger.debug('Aborted after search, before embed');
      break;
    }

    const allCandidates = hits.map(hitToCandidate).filter((c): c is EntityToEmbed => c !== null);

    // Phase 3 — Skip role accounts at the page-collection step so we don't
    // waste an inference call on them (design §11 E9). Defence-in-depth check
    // also happens at link time on the kNN side.
    const candidates: EntityToEmbed[] = [];
    let pageSkippedRoleAccount = 0;
    for (const c of allCandidates) {
      if (linkingEnabled && isRoleAccount(c.identity)) {
        pageSkippedRoleAccount++;
        continue;
      }
      candidates.push(c);
    }

    let pageEmbedded = 0;
    let pageFailed = 0;
    let okCandidates: Array<EntityToEmbed & { vector: number[] }> = [];
    // Subset of `candidates` whose vector landed in the index this page —
    // used to advance the watermark so role-account-skipped or bulk-failed
    // hits do not bury entities under a `first_seen > watermark` filter on
    // the next run.
    let successfullyEmbedded: EntityToEmbed[] = [];

    if (candidates.length === 0) {
      logger.debug(
        `Page returned ${hits.length} hit(s) but none had usable identity fields; skipping batch`
      );
    } else {
      try {
        const vectors = await embedBatch({
          esClient,
          inferenceId,
          inputs: candidates.map((c) => c.identityString),
        });

        if (abortController.signal.aborted) {
          logger.debug('Aborted after embed, before bulk write');
          break;
        }

        const now = new Date().toISOString();
        const updates = candidates.map((c, i) => ({
          docId: c.docId,
          // Use dotted field paths so that unflattenObject (called inside
          // bulkUpdateEntityDocs) correctly nests the keys regardless of
          // which slot is in use (primary or a named secondary slot).
          doc: {
            [embeddingField]: vectors[i],
            [embeddingSourceField]: CURRENT_EMBED_SOURCE_VERSION,
            [embeddedAtField]: now,
          },
        }));

        // `wait_for` rather than `false` so the just-written vectors are
        // searchable by the kNN call that `applyLinksForPage` makes a few
        // statements below. With `refresh: false` the link step would race
        // the default ~1s refresh interval and find an empty corpus — every
        // entity would then be counted as `skippedBelowThreshold`. The
        // wait_for cost (≤1 refresh interval per page) is acceptable on the
        // 5m maintainer cadence and matches the platform default in
        // `bulkUpdateEntityDocs` (see infra/elasticsearch/resolution.ts).
        const bulkResponse = await bulkUpdateEntityDocs(esClient, {
          index,
          updates,
          refresh: 'wait_for',
        });

        const { ok, failed: bulkFailed } = countBulkResults(bulkResponse, logger);
        pageEmbedded = ok;
        pageFailed = bulkFailed;

        // Pair each candidate with its successfully-written doc by index.
        // The bulk items array preserves order (ES bulk contract), so item i
        // corresponds to candidate i. Anything that errored gets dropped
        // from both the link step and the watermark advance — we never link
        // (or move past) an entity whose vector didn't land.
        const isOk = (i: number) => {
          if (!bulkResponse.errors) return true;
          const item = bulkResponse.items[i];
          const op = item.update ?? item.index ?? item.create;
          return !op?.error;
        };
        successfullyEmbedded = candidates.filter((_c, i) => isOk(i));
        if (linkingEnabled) {
          okCandidates = candidates
            .map((c, i) => ({ candidate: c, vector: vectors[i], i }))
            .filter(({ i }) => isOk(i))
            .map(({ candidate, vector }) => ({ ...candidate, vector }));
        }
      } catch (err) {
        pageFailed = candidates.length;
        logger.error(
          `embedding-resolution: batch of ${candidates.length} entities failed: ${
            (err as Error)?.message ?? err
          }`
        );
      }
    }

    embedded += pageEmbedded;
    failed += pageFailed;
    linkMetrics.skippedRoleAccount += pageSkippedRoleAccount;

    if (linkingEnabled && okCandidates.length > 0 && !abortController.signal.aborted) {
      const pageLinkMetrics = await applyLinksForPage({
        esClient,
        index,
        embedded: okCandidates,
        inferenceId,
        embeddingField,
        threshold,
        k,
        numCandidates,
        resolutionClient,
        logger,
        abortController,
        parallelResolutionEnabled,
      });
      linkMetrics.linked += pageLinkMetrics.linked;
      linkMetrics.skippedAmbiguous += pageLinkMetrics.skippedAmbiguous;
      linkMetrics.skippedBelowThreshold += pageLinkMetrics.skippedBelowThreshold;
      linkMetrics.skippedRoleAccount += pageLinkMetrics.skippedRoleAccount;
    }

    for (const c of successfullyEmbedded) {
      if (c.firstSeen > maxTimestamp) {
        maxTimestamp = c.firstSeen;
      }
    }

    // Advance search_after using the last hit's sort key.
    // We keep looping until the next page returns zero hits — relying on
    // hits.length < PAGE_SIZE would let a perfectly-full last page hang the
    // loop and is also fragile in tests where PAGE_SIZE is the default.
    const lastHit = hits[hits.length - 1];
    if (!lastHit.sort || lastHit.sort.length === 0) {
      break;
    }
    searchAfter = lastHit.sort as Array<string | number>;
  }

  if (failed === 0 && embedded > 0) {
    logger.info(
      `embedding-resolution: embedded ${embedded} entities, advancing watermark to ${maxTimestamp}` +
        (linkingEnabled
          ? ` (linked=${linkMetrics.linked}, skippedAmbiguous=${linkMetrics.skippedAmbiguous}, ` +
            `skippedBelowThreshold=${linkMetrics.skippedBelowThreshold}, skippedRoleAccount=${linkMetrics.skippedRoleAccount})`
          : '')
    );
  } else if (failed > 0) {
    logger.warn(
      `embedding-resolution: ${embedded} embedded, ${failed} failed — watermark NOT advanced`
    );
  } else {
    logger.debug('embedding-resolution: no entities embedded this run');
  }

  return {
    lastProcessedTimestamp:
      failed === 0 && embedded > 0 ? maxTimestamp : state.lastProcessedTimestamp,
    embedSourceVersion: CURRENT_EMBED_SOURCE_VERSION,
    lastRun: {
      embedded,
      failed,
      linked: linkMetrics.linked,
      skippedAmbiguous: linkMetrics.skippedAmbiguous,
      skippedBelowThreshold: linkMetrics.skippedBelowThreshold,
      skippedRoleAccount: linkMetrics.skippedRoleAccount,
    },
  };
}

/**
 * Phase 3 link step. For each just-embedded entity, run kNN over the corpus
 * and link to the top above-threshold candidate. Mirrors `resolveMatchBuckets`
 * in `automated_resolution/run.ts:276–327`:
 *
 * 1. Skip role accounts (defence in depth — they shouldn't have been embedded
 *    either, but tolerate legacy data and version drift).
 * 2. Skip ambiguous candidates (top-2 tied at the highest score) — design
 *    §11 + 9.4 rules-engine parity.
 * 3. Skip below-threshold matches.
 * 4. Branch on whether the top candidate is itself an alias (extend existing
 *    group) or standalone (create a new pair). Per design §7 final paragraph.
 *
 * Link failures are logged and counted but do NOT block the watermark — the
 * embed step's vector is the durable artefact; links can be re-attempted by
 * a future run that re-embeds (e.g. on a recipe-version bump). Phase 2's
 * watermark semantics are preserved per the plan.
 */
async function applyLinksForPage({
  esClient,
  index,
  embedded: embeddedEntries,
  inferenceId,
  embeddingField,
  threshold,
  k,
  numCandidates,
  resolutionClient,
  logger,
  abortController,
  parallelResolutionEnabled,
}: {
  esClient: ElasticsearchClient;
  index: string;
  embedded: Array<EntityToEmbed & { vector: number[] }>;
  inferenceId: string;
  embeddingField: string;
  threshold: number;
  k: number;
  numCandidates: number;
  resolutionClient: ResolutionClient;
  logger: Logger;
  abortController: AbortController;
  parallelResolutionEnabled: boolean;
}): Promise<LinkRunMetrics> {
  const metrics: LinkRunMetrics = {
    linked: 0,
    skippedAmbiguous: 0,
    skippedBelowThreshold: 0,
    skippedRoleAccount: 0,
  };

  for (const entry of embeddedEntries) {
    if (abortController.signal.aborted) {
      logger.debug('Aborted during link step');
      break;
    }

    let candidates: KnnCandidate[];
    try {
      candidates = await collectKnnCandidates({
        esClient,
        index,
        entityId: entry.entityId,
        queryVector: entry.vector,
        entityType: ENTITY_TYPE,
        field: embeddingField,
        k,
        numCandidates,
        // Pull every neighbour back; threshold is enforced explicitly below
        // so we can distinguish "below threshold" from "no neighbours at all"
        // in the metrics.
        minSimilarity: 0,
      });
    } catch (err) {
      logger.warn(
        `embedding-resolution: kNN search failed for '${entry.entityId}': ${
          (err as Error)?.message ?? err
        }`
      );
      continue;
    }

    // Defence in depth: drop role-account candidates even though they should
    // have been excluded at embed time (design §11 E9).
    const allowed = candidates.filter((c) => {
      if (isRoleAccount(c.identity)) {
        metrics.skippedRoleAccount += 1;
        return false;
      }
      return true;
    });

    if (allowed.length === 0) {
      metrics.skippedBelowThreshold += 1;
      continue;
    }

    // Sort defensively: kNN returns by score desc, but we want guarantees in
    // case the response shape ever drifts (cheap to do post-filter).
    allowed.sort((a, b) => b.score - a.score);
    const top = allowed[0];

    if (top.score < threshold) {
      metrics.skippedBelowThreshold += 1;
      continue;
    }

    // Ambiguity guard — multiple candidates tied at the top score (design §11
    // + parity with `automated_resolution/run.ts:289–295`). v1 uses ε=0 so
    // this fires only on a literal tie; configurable later if needed.
    if (allowed.length >= 2 && allowed[1].score === top.score) {
      metrics.skippedAmbiguous += 1;
      logger.warn(
        `embedding-resolution: skipping ambiguous bucket for '${entry.entityId}' — ` +
          `top-2 candidates tied at ${top.score} (${top.candidateId}, ${allowed[1].candidateId})`
      );
      continue;
    }

    // Choose target: extend an existing group when the top candidate is
    // itself an alias (design §7 final paragraph), else pair them up with
    // the candidate as the target. The just-embedded entity is always the
    // alias since the candidate is the established side by construction —
    // no NAMESPACE_PRIORITY tiebreaker needed for this branch.
    const targetId = top.resolvedTo ?? top.candidateId;

    try {
      await resolutionClient.linkEntities(targetId, [entry.entityId], {
        refresh: false,
        provenance: {
          resolved_by: 'embedding',
          score: top.score,
          model_id: inferenceId,
        },
        // In parallel mode, route through the source-aware path so the
        // merge layer records `by_embedding.*` and computes
        // `effective_to` / `divergent` against any pre-existing rule
        // verdict on the same alias.
        ...(parallelResolutionEnabled ? { source: 'embedding' as const } : {}),
      });
      metrics.linked += 1;
    } catch (err) {
      logger.warn(
        `embedding-resolution: failed to link '${entry.entityId}' → '${targetId}': ${
          (err as Error)?.message ?? err
        }`
      );
    }
  }

  return metrics;
}

/**
 * One page of unresolved-and-stale user entities. Sorted by
 * (first_seen, entity.id) so `search_after` pagination is stable even when
 * many entities share a first_seen timestamp.
 */
async function searchUnresolvedToEmbed({
  esClient,
  index,
  watermark,
  searchAfter,
  embeddingField,
  embeddingSourceField,
  resolvedToField,
}: {
  esClient: ElasticsearchClient;
  index: string;
  watermark: string | null;
  searchAfter?: Array<string | number>;
  embeddingField: string;
  embeddingSourceField: string;
  resolvedToField: string;
}): Promise<SearchResponse<Record<string, unknown>>> {
  // Two reasons a doc is eligible for (re-)embedding:
  //
  //   A) "missing embedding" — brand new doc with no vector yet. This is the
  //      incremental path; gate it by `first_seen > watermark` so steady-state
  //      runs only look at recently-arrived entities.
  //
  //   B) "stale source version" — embedding exists but was produced from an
  //      older `embedSourceVersion` recipe. We DO want to revisit these
  //      regardless of `first_seen` so a recipe bump (or per-entity stale-flag
  //      reset) can heal the corpus. ANDing watermark here strands old docs
  //      forever, which is the bug we're fixing.
  //
  // Path A is watermark-gated; Path B ignores watermark by design.
  const missingEmbedding: object = {
    bool: { must_not: { exists: { field: embeddingField } } },
  };
  const missingEmbeddingBranch = watermark
    ? {
        bool: {
          must: [missingEmbedding, { range: { [FIRST_SEEN_FIELD]: { gt: watermark } } }],
        },
      }
    : missingEmbedding;
  const staleSourceBranch = {
    bool: {
      must_not: { term: { [embeddingSourceField]: CURRENT_EMBED_SOURCE_VERSION } },
    },
  };

  const filters: object[] = [
    { term: { [ENGINE_METADATA_TYPE_FIELD]: ENTITY_TYPE } },
    { bool: { must_not: { exists: { field: resolvedToField } } } },
    {
      bool: {
        should: [missingEmbeddingBranch, staleSourceBranch],
        minimum_should_match: 1,
      },
    },
  ];

  return esClient.search({
    index,
    size: PAGE_SIZE,
    sort: [{ [FIRST_SEEN_FIELD]: 'asc' }, { [ENTITY_ID_FIELD]: 'asc' }],
    _source: [
      ENTITY_ID_FIELD,
      FIRST_SEEN_FIELD,
      'user.name',
      'user.full_name',
      'user.email',
      embeddingSourceField,
    ],
    query: { bool: { filter: filters } },
    ...(searchAfter ? { search_after: searchAfter } : {}),
  });
}

function hitToCandidate(hit: SearchHit<Record<string, unknown>>): EntityToEmbed | null {
  const source = hit._source;
  if (!source || !hit._id) return null;

  const entityId = getFieldValue(source, ENTITY_ID_FIELD);
  const firstSeen = getFieldValue(source, FIRST_SEEN_FIELD);
  const name = getFieldValue(source, 'user.name');
  const fullName = getFieldValue(source, 'user.full_name');
  const email = getFieldValue(source, 'user.email');

  if (!entityId || !firstSeen) return null;

  const identity: IdentityFields = {
    name: name ?? undefined,
    full_name: fullName ?? undefined,
    email: email ?? undefined,
  };
  const identityString = buildIdentityString(identity);
  if (identityString === '') return null;

  return {
    docId: hit._id,
    entityId,
    firstSeen,
    identityString,
    identity,
  };
}

function countBulkResults(
  bulkResponse: BulkResponse,
  logger: Logger
): { ok: number; failed: number } {
  if (!bulkResponse.errors) {
    return { ok: bulkResponse.items.length, failed: 0 };
  }
  let ok = 0;
  let bulkFailed = 0;
  for (const item of bulkResponse.items) {
    const op = item.update ?? item.index ?? item.create ?? item.delete;
    if (op?.error) {
      bulkFailed++;
      logger.error(
        `embedding-resolution: bulk update failed for _id=${op._id}: ${
          op.error.type ?? 'unknown'
        } ${op.error.reason ?? ''}`
      );
    } else {
      ok++;
    }
  }
  return { ok, failed: bulkFailed };
}
