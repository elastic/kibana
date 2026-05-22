/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BulkResponse, SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_ID_FIELD } from '../../../common/domain/definitions/common_fields';
import { getFieldValue } from '../../../common/domain/euid/commons';
import { ENGINE_METADATA_TYPE_FIELD } from '../../domain/logs_extraction/query_builder_commons';
import { bulkUpdateEntityDocs } from '../../infra/elasticsearch/resolution';
import type { ResolutionClient } from '../../domain/resolution/resolution_client';
import {
  CURRENT_EMBED_SOURCE_VERSION,
  buildIdentityString,
  embedBatch,
  type IdentityFields,
} from './embed';
import { USER_IDENTITY_SOURCE_FIELDS, extractUserIdentity } from './identity_fields';
import { collectKnnCandidates, type KnnCandidate } from './knn';
import { isRoleAccount } from './role_account_guard';
import { bulkItemIsOk, formatError } from './run_helpers';
import type { EntityToEmbed } from './types';

const ENTITY_TYPE = 'user';
const FIRST_SEEN_FIELD = 'entity.lifecycle.first_seen';

/**
 * Per-page batch size. Keeps the inference call small enough to stay under
 * provider request budgets while still amortising the per-request overhead.
 */
const PAGE_SIZE = 100;

/** Per-run link-step counters layered on top of the embed counters. */
export interface LinkRunMetrics {
  linked: number;
  skippedAmbiguous: number;
  skippedBelowThreshold: number;
  skippedRoleAccount: number;
}

const zeroLinkMetrics = (): LinkRunMetrics => ({
  linked: 0,
  skippedAmbiguous: 0,
  skippedBelowThreshold: 0,
  skippedRoleAccount: 0,
});

export interface PageDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  abortController: AbortController;
  index: string;
  watermark: string | null;
  searchAfter: Array<string | number> | undefined;
  inferenceId: string;
  embeddingField: string;
  embeddingSourceField: string;
  embeddedAtField: string;
  resolvedToField: string;
  linkingEnabled: boolean;
  threshold: number;
  k: number;
  numCandidates: number;
  resolutionClient: ResolutionClient;
  parallelResolutionEnabled: boolean;
}

/**
 * Outcome of one search → filter → embed → bulk → link iteration.
 *
 * The orchestrator inspects `empty` and `aborted` to decide whether to keep
 * paginating. `aborted: true` means abort fired between search and bulk write —
 * no per-page counters should be accumulated (matches the pre-refactor
 * behavior where `break` skipped the metric/watermark/searchAfter updates).
 */
export interface PageOutcome {
  /** True when the page returned zero hits — orchestrator stops pagination. */
  empty: boolean;
  /**
   * True when abort fired between search and bulk write. Orchestrator should
   * stop pagination AND skip per-page accumulation to match the original
   * "break before update" semantics.
   */
  aborted: boolean;
  pageEmbedded: number;
  pageFailed: number;
  pageSkippedRoleAccount: number;
  pageLinkMetrics: LinkRunMetrics;
  /** Hits whose vector successfully landed; orchestrator advances watermark from these. */
  successfullyEmbedded: EntityToEmbed[];
  /** Sort key from last hit; undefined ends pagination. */
  nextSearchAfter: Array<string | number> | undefined;
}

const emptyOutcome: PageOutcome = {
  empty: true,
  aborted: false,
  pageEmbedded: 0,
  pageFailed: 0,
  pageSkippedRoleAccount: 0,
  pageLinkMetrics: zeroLinkMetrics(),
  successfullyEmbedded: [],
  nextSearchAfter: undefined,
};

const abortedOutcome: PageOutcome = {
  empty: false,
  aborted: true,
  pageEmbedded: 0,
  pageFailed: 0,
  pageSkippedRoleAccount: 0,
  pageLinkMetrics: zeroLinkMetrics(),
  successfullyEmbedded: [],
  nextSearchAfter: undefined,
};

/**
 * Run one pagination iteration: search → filter → embed → bulk → link.
 * Pure orchestration of the existing helpers; the watermark advance,
 * outer abort guard, and final logging stay in `runEmbeddingResolution`.
 */
export async function processPage(deps: PageDeps): Promise<PageOutcome> {
  const {
    esClient,
    logger,
    abortController,
    index,
    watermark,
    searchAfter,
    inferenceId,
    embeddingField,
    embeddingSourceField,
    embeddedAtField,
    resolvedToField,
    linkingEnabled,
    threshold,
    k,
    numCandidates,
    resolutionClient,
    parallelResolutionEnabled,
  } = deps;

  const response = await searchUnresolvedToEmbed({
    esClient,
    index,
    watermark,
    searchAfter,
    embeddingField,
    embeddingSourceField,
    resolvedToField,
  });

  const hits = response.hits.hits;
  if (hits.length === 0) {
    return emptyOutcome;
  }

  if (abortController.signal.aborted) {
    logger.debug('Aborted after search, before embed');
    return abortedOutcome;
  }

  const allCandidates = hits.map(hitToCandidate).filter((c): c is EntityToEmbed => c !== null);

  const { candidates, pageSkippedRoleAccount } = selectCandidates(allCandidates, linkingEnabled);

  const embedResult = await embedAndBulkWrite({
    esClient,
    logger,
    abortController,
    candidates,
    hitsLength: hits.length,
    inferenceId,
    embeddingField,
    embeddingSourceField,
    embeddedAtField,
    index,
    linkingEnabled,
  });

  if (embedResult.aborted) {
    return abortedOutcome;
  }

  const { pageEmbedded, pageFailed, successfullyEmbedded, okCandidates } = embedResult;

  let pageLinkMetrics: LinkRunMetrics = zeroLinkMetrics();
  if (linkingEnabled && okCandidates.length > 0 && !abortController.signal.aborted) {
    pageLinkMetrics = await applyLinksForPage({
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
  }

  const lastHit = hits[hits.length - 1];
  const nextSearchAfter =
    lastHit.sort && lastHit.sort.length > 0 ? (lastHit.sort as Array<string | number>) : undefined;

  return {
    empty: false,
    aborted: false,
    pageEmbedded,
    pageFailed,
    pageSkippedRoleAccount,
    pageLinkMetrics,
    successfullyEmbedded,
    nextSearchAfter,
  };
}

/**
 * Phase 3 — Skip role accounts at the page-collection step so we don't waste
 * an inference call on them (design §11 E9). Defence-in-depth check also
 * happens at link time on the kNN side.
 */
function selectCandidates(
  allCandidates: EntityToEmbed[],
  linkingEnabled: boolean
): { candidates: EntityToEmbed[]; pageSkippedRoleAccount: number } {
  const candidates: EntityToEmbed[] = [];
  let pageSkippedRoleAccount = 0;
  for (const c of allCandidates) {
    if (linkingEnabled && isRoleAccount(c.identity)) {
      pageSkippedRoleAccount++;
      continue;
    }
    candidates.push(c);
  }
  return { candidates, pageSkippedRoleAccount };
}

interface EmbedAndBulkResult {
  aborted: boolean;
  pageEmbedded: number;
  pageFailed: number;
  successfullyEmbedded: EntityToEmbed[];
  okCandidates: Array<EntityToEmbed & { vector: number[] }>;
}

/**
 * Embed the page of candidates and bulk-write the resulting vectors. Surfaces
 * abort signals (between embed and bulk) so the caller can bail without
 * advancing watermarks. Failures inside the try/catch are logged and counted
 * but do not abort the run.
 */
async function embedAndBulkWrite({
  esClient,
  logger,
  abortController,
  candidates,
  hitsLength,
  inferenceId,
  embeddingField,
  embeddingSourceField,
  embeddedAtField,
  index,
  linkingEnabled,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  abortController: AbortController;
  candidates: EntityToEmbed[];
  hitsLength: number;
  inferenceId: string;
  embeddingField: string;
  embeddingSourceField: string;
  embeddedAtField: string;
  index: string;
  linkingEnabled: boolean;
}): Promise<EmbedAndBulkResult> {
  if (candidates.length === 0) {
    logger.debug(
      `Page returned ${hitsLength} hit(s) but none had usable identity fields; skipping batch`
    );
    return {
      aborted: false,
      pageEmbedded: 0,
      pageFailed: 0,
      successfullyEmbedded: [],
      okCandidates: [],
    };
  }

  try {
    const vectors = await embedBatch({
      esClient,
      inferenceId,
      inputs: candidates.map((c) => c.identityString),
    });

    if (abortController.signal.aborted) {
      logger.debug('Aborted after embed, before bulk write');
      return {
        aborted: true,
        pageEmbedded: 0,
        pageFailed: 0,
        successfullyEmbedded: [],
        okCandidates: [],
      };
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

    const { ok, failed } = countBulkResults(bulkResponse, logger);

    // Pair each candidate with its successfully-written doc by index.
    // The bulk items array preserves order (ES bulk contract), so item i
    // corresponds to candidate i. Anything that errored gets dropped
    // from both the link step and the watermark advance — we never link
    // (or move past) an entity whose vector didn't land.
    const isOk = (i: number) => !bulkResponse.errors || bulkItemIsOk(bulkResponse.items[i]);
    const successfullyEmbedded = candidates.filter((_c, i) => isOk(i));
    const okCandidates = linkingEnabled
      ? candidates
          .map((c, i) => ({ candidate: c, vector: vectors[i], i }))
          .filter(({ i }) => isOk(i))
          .map(({ candidate, vector }) => ({ ...candidate, vector }))
      : [];

    return {
      aborted: false,
      pageEmbedded: ok,
      pageFailed: failed,
      successfullyEmbedded,
      okCandidates,
    };
  } catch (err) {
    logger.error(
      `embedding-resolution: batch of ${candidates.length} entities failed: ${formatError(err)}`
    );
    return {
      aborted: false,
      pageEmbedded: 0,
      pageFailed: candidates.length,
      successfullyEmbedded: [],
      okCandidates: [],
    };
  }
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
  const metrics: LinkRunMetrics = zeroLinkMetrics();

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
        `embedding-resolution: kNN search failed for '${entry.entityId}': ${formatError(err)}`
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
        `embedding-resolution: failed to link '${entry.entityId}' → '${targetId}': ${formatError(
          err
        )}`
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
      ...USER_IDENTITY_SOURCE_FIELDS,
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
  if (!entityId || !firstSeen) return null;

  const identity: IdentityFields = extractUserIdentity(source);
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
    if (bulkItemIsOk(item)) {
      ok++;
      continue;
    }
    bulkFailed++;
    const op = item.update ?? item.index ?? item.create ?? item.delete;
    logger.error(
      `embedding-resolution: bulk update failed for _id=${op?._id}: ${
        op?.error?.type ?? 'unknown'
      } ${op?.error?.reason ?? ''}`
    );
  }
  return { ok, failed: bulkFailed };
}
