/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '../../tasks/entity_maintainers/types';
import {
  CURRENT_EMBED_SOURCE_VERSION,
  DEFAULT_EMBEDDED_AT_FIELD,
  DEFAULT_EMBEDDING_FIELD,
  DEFAULT_EMBEDDING_SOURCE_FIELD,
} from './embed';
import {
  DEFAULT_LINK_K,
  DEFAULT_LINK_NUM_CANDIDATES,
  DEFAULT_LINK_THRESHOLD,
  runEmbeddingResolution,
} from './run';
import { verifyInferenceEndpoint } from './setup';
import type { EmbeddingResolutionState } from './types';

const PRIMARY_MAINTAINER_ID = 'embedding-resolution';

/**
 * Dimensions baked into the entity.resolution.embedding mapping. Must match
 * the configured inference endpoint's dims or every bulk write will fail.
 * See common_fields.ts for the matching `dense_vector` mapping.
 */
export const EMBEDDING_DIMS = 1024;

const initialState: EmbeddingResolutionState = {
  lastProcessedTimestamp: null,
  embedSourceVersion: CURRENT_EMBED_SOURCE_VERSION,
  lastRun: null,
};

/**
 * Factory because the inference endpoint id and Phase 3 link knobs are plugin-
 * config-driven and aren't available at module import time. Mirrors the
 * simpler `automatedResolutionMaintainerConfig` pattern but threads the
 * config through.
 *
 * @param inferenceId The `_inference` endpoint id to call. Defaults to the EIS
 *   `.jina-embeddings-v5-text-small` constant chosen in
 *   `er-v2-embedding-resolution-design.md`; operators can override via
 *   `xpack.securitySolution.entityAnalytics.entityStore.embeddingResolution.inferenceId`.
 * @param expectedDims Sanity-check value for the endpoint dimensions. Defaults
 *   to {@link EMBEDDING_DIMS}.
 * @param slot Optional name for a secondary embedding slot. When omitted the
 *   primary slot (`entity.resolution.embedding`) is used and the maintainer ID
 *   is `embedding-resolution`. When provided:
 *   - The maintainer ID becomes `embedding-resolution:<slot>` so it runs as an
 *     independent Task Manager task with its own watermark and `lastRun` state.
 *   - The dense_vector field path becomes
 *     `entity.resolution.embeddings.<slot>` (note plural).
 *   - The source tag and embedded-at timestamp follow the `<field>_source` /
 *     `<field>_at` sibling convention.
 *   The corresponding `dense_vector` mapping must also be registered via
 *   `embeddingSlotFields()` in `common_fields.ts` before the first run.
 * @param linkingEnabled Phase 3 toggle — when true, the run loop also kNN-
 *   searches and stamps `resolved_to` for above-threshold candidates. When
 *   false (Phase 2 default), the maintainer only embeds. Wired from the
 *   `entityAnalyticsEmbeddingResolutionEnabled` experimental feature flag in
 *   the security_solution plugin.
 * @param threshold Cosine-similarity cutoff for `resolved_by: 'embedding'`
 *   links (design §9 default 0.85). Ignored when `linkingEnabled` is false.
 * @param k / numCandidates kNN tuning parameters (design §7 defaults 10 / 100).
 */
export function createEmbeddingResolutionMaintainerConfig({
  inferenceId,
  expectedDims = EMBEDDING_DIMS,
  slot,
  linkingEnabled = false,
  threshold = DEFAULT_LINK_THRESHOLD,
  k = DEFAULT_LINK_K,
  numCandidates = DEFAULT_LINK_NUM_CANDIDATES,
  parallelResolutionEnabled = false,
}: {
  inferenceId: string;
  expectedDims?: number;
  slot?: string;
  linkingEnabled?: boolean;
  threshold?: number;
  k?: number;
  numCandidates?: number;
  /**
   * When true, run loop targets the per-source `by_embedding.*` slot
   * instead of the legacy single slot. See `RunDeps.parallelResolutionEnabled`.
   * Wired from the `entityAnalyticsParallelResolution` flag.
   */
  parallelResolutionEnabled?: boolean;
}): RegisterEntityMaintainerConfig {
  const maintainerId = slot ? `${PRIMARY_MAINTAINER_ID}:${slot}` : PRIMARY_MAINTAINER_ID;
  const embeddingField = slot ? `entity.resolution.embeddings.${slot}` : DEFAULT_EMBEDDING_FIELD;
  const embeddingSourceField = slot
    ? `entity.resolution.embeddings.${slot}_source`
    : DEFAULT_EMBEDDING_SOURCE_FIELD;
  const embeddedAtField = slot
    ? `entity.resolution.embeddings.${slot}_at`
    : DEFAULT_EMBEDDED_AT_FIELD;

  return {
    id: maintainerId,
    description: linkingEnabled
      ? `Embeds unresolved user entities and auto-links above-threshold neighbours (slot: ${
          slot ?? 'primary'
        }, Phase 3)`
      : `Embeds unresolved user entities for semantic identity matching (slot: ${
          slot ?? 'primary'
        }, Phase 2: no auto-linking)`,
    interval: '5m',
    initialState,
    minLicense: 'enterprise',
    setup: async ({ esClient, logger, status }) => {
      // Eagerly surface "EIS not connected" on first run. The run loop
      // re-verifies on every invocation so that completing cloud_connect
      // afterwards does not require a Kibana restart.
      await verifyInferenceEndpoint({
        esClient,
        inferenceId,
        expectedDims,
        logger,
      });
      // Setup must return a state; we don't mutate anything here.
      return status.state;
    },
    run: async ({ status, abortController, logger, esClient }) => {
      const state = status.state as EmbeddingResolutionState;
      return runEmbeddingResolution({
        state,
        namespace: status.metadata.namespace,
        esClient,
        logger,
        inferenceId,
        expectedDims,
        abortController,
        linkingEnabled,
        threshold,
        k,
        numCandidates,
        embeddingField,
        embeddingSourceField,
        embeddedAtField,
        parallelResolutionEnabled,
      });
    },
  };
}
