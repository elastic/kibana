/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * Canonical ES field paths for the primary embedding slot.
 * Used as defaults in `RunDeps` and `createEmbeddingResolutionMaintainerConfig`
 * so callers can reference the paths without re-typing string literals.
 * Additional slots use `entity.resolution.embeddings.<slot>` paths instead.
 */
export const DEFAULT_EMBEDDING_FIELD = 'entity.resolution.embedding';
export const DEFAULT_EMBEDDING_SOURCE_FIELD = 'entity.resolution.embedding_source';
export const DEFAULT_EMBEDDED_AT_FIELD = 'entity.resolution.embedded_at';

/**
 * Ordered field list that drives the identity string. Order matters because
 * the output is a stable key-value string fed to the embedder — changing the
 * order changes the resulting vector even if the same fields are present.
 *
 * Bumping this list MUST also bump CURRENT_EMBED_SOURCE_VERSION so the run
 * loop re-embeds previously-vectorised entities.
 */
export const EMBED_SOURCE_FIELDS = ['name', 'full_name', 'email'] as const;

/**
 * Tag written to `entity.resolution.embedding_source` next to every vector so
 * we can tell *which* recipe produced it. Format is `<version>:<csv fields>|<template>`.
 *
 * Re-embed triggers: any entity whose stored embedding_source !== this value is
 * collected by the run loop on its next pass (see run.ts §collect).
 */
export const CURRENT_EMBED_SOURCE_VERSION = 'v1:name,full_name,email|key-value';

/**
 * Hard cap on inputs per `_inference` call. Set to match the EIS Jina v5
 * endpoint validated against in `er-v2-embedding-resolution-howto.md` §4 —
 * sending more than 16 returns
 *   `validation failed: field [input] must contain at most 16 item(s)` (HTTP 400).
 *
 * Other endpoints have higher caps but 16 is the safe lowest-common-denominator
 * and keeps the per-page batch cost predictable. Bump only if the chosen
 * inference endpoint is known to support more (and, ideally, plumb it through
 * config — see embedding-resolution config knobs in Phase 3g).
 */
export const INFERENCE_BATCH_SIZE = 16;

export interface IdentityFields {
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
}

/**
 * Renders identity fields into the deterministic key-value string that gets
 * embedded. Per design §6: lowercased, trimmed, stable key order, empty fields
 * omitted. Namespace and provider noise are deliberately excluded so that
 * `alice@corp.com` (okta) and `Alice@Corp.com` (entra_id) embed near each other
 * (the #13 fixture in er-v2-9.4-test-data.md).
 */
export function buildIdentityString(fields: IdentityFields): string {
  const parts: string[] = [];
  for (const key of EMBED_SOURCE_FIELDS) {
    const raw = fields[key];
    if (raw == null) continue;
    const normalised = String(raw).trim().toLowerCase();
    if (normalised === '') continue;
    parts.push(`${key}: ${normalised}`);
  }
  return parts.join('; ');
}

/**
 * Embeds `inputs` via the `_inference` API. Internally chunks into batches of
 * at most {@link INFERENCE_BATCH_SIZE} so we never exceed the EIS Jina v5 cap
 * (see {@link INFERENCE_BATCH_SIZE} for the exact failure mode we're avoiding).
 *
 * Mirrors the call shape used by
 * x-pack/platform/plugins/shared/agent_builder/server/step_types/rerank_step.ts
 * but for `task_type: text_embedding`. Chunks run sequentially to stay within
 * provider rate budgets and to fail fast — the first chunk error aborts the
 * whole batch so the watermark stays put (parity with automated_resolution/run.ts).
 *
 * Returns the dense vectors in the same order as `inputs`. Throws if any
 * chunk's response shape or length is unexpected.
 */
export async function embedBatch({
  esClient,
  inferenceId,
  inputs,
}: {
  esClient: ElasticsearchClient;
  inferenceId: string;
  inputs: string[];
}): Promise<number[][]> {
  if (inputs.length === 0) {
    return [];
  }

  const result: number[][] = [];

  for (let offset = 0; offset < inputs.length; offset += INFERENCE_BATCH_SIZE) {
    const chunk = inputs.slice(offset, offset + INFERENCE_BATCH_SIZE);
    const response = (await esClient.inference.inference({
      inference_id: inferenceId,
      task_type: 'text_embedding',
      input: chunk,
    })) as { text_embedding?: Array<{ embedding: number[] }> };

    const embeddings = response?.text_embedding;
    if (!Array.isArray(embeddings)) {
      throw new Error(
        `Inference response for '${inferenceId}' missing text_embedding array; got: ${JSON.stringify(
          response
        )}`
      );
    }
    if (embeddings.length !== chunk.length) {
      throw new Error(
        `Inference response for '${inferenceId}' expected ${chunk.length} embeddings, got ${embeddings.length}`
      );
    }

    for (const e of embeddings) {
      result.push(e.embedding);
    }
  }

  return result;
}
