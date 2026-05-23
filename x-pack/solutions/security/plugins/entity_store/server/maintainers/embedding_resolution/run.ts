/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getLatestEntitiesIndexName } from '../../../common';
import { perSourceResolvedToField } from '../../domain/resolution/parallel_resolution';
import { ResolutionClient } from '../../domain/resolution/resolution_client';
import {
  CURRENT_EMBED_SOURCE_VERSION,
  DEFAULT_EMBEDDED_AT_FIELD,
  DEFAULT_EMBEDDING_FIELD,
  DEFAULT_EMBEDDING_SOURCE_FIELD,
} from './embed';
import { processPage, type LinkRunMetrics } from './page';
import { verifyInferenceEndpoint } from './setup';
import type { EmbeddingResolutionState } from './types';

const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const BY_EMBEDDING_RESOLVED_TO_FIELD = perSourceResolvedToField('embedding');

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

const ZERO_LAST_RUN = {
  embedded: 0,
  failed: 0,
  linked: 0,
  skippedAmbiguous: 0,
  skippedBelowThreshold: 0,
  skippedRoleAccount: 0,
};

/**
 * Phase 2 of er-v2-embedding-resolution-design.md — embed unresolved user
 * entities; do NOT link them. Mirrors the shape of automated_resolution/run.ts
 * (verify → collect → process → watermark) so failure / abort / retry semantics
 * stay consistent across both maintainers.
 *
 * Per-page work (search → embed → bulk → link) is delegated to
 * {@link processPage} in `./page`; this function owns only the outer loop's
 * abort/watermark/logging concerns.
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
    return { ...state, lastRun: { ...ZERO_LAST_RUN } };
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
  const resolvedToField = parallelResolutionEnabled
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

    const outcome = await processPage({
      esClient,
      logger,
      abortController,
      index,
      watermark: effectiveWatermark,
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
    });

    if (outcome.empty) {
      break;
    }
    // Match the pre-refactor behavior where the inner `break` skipped both
    // metric accumulation and watermark advance for the partial page.
    if (outcome.aborted) {
      break;
    }

    embedded += outcome.pageEmbedded;
    failed += outcome.pageFailed;
    linkMetrics.linked += outcome.pageLinkMetrics.linked;
    linkMetrics.skippedAmbiguous += outcome.pageLinkMetrics.skippedAmbiguous;
    linkMetrics.skippedBelowThreshold += outcome.pageLinkMetrics.skippedBelowThreshold;
    linkMetrics.skippedRoleAccount +=
      outcome.pageSkippedRoleAccount + outcome.pageLinkMetrics.skippedRoleAccount;

    for (const c of outcome.successfullyEmbedded) {
      if (c.firstSeen > maxTimestamp) {
        maxTimestamp = c.firstSeen;
      }
    }

    // Advance search_after using the last hit's sort key. We keep looping
    // until the next page returns zero hits — relying on hits.length < PAGE_SIZE
    // would let a perfectly-full last page hang the loop and is also fragile
    // in tests where the page size is the default.
    if (!outcome.nextSearchAfter) {
      break;
    }
    searchAfter = outcome.nextSearchAfter;
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
