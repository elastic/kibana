/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { extractIocs } from './extract_iocs';
import { extractDiamond } from './extract_diamond';
import { searchByAnchors } from './search_by_anchors';
import { searchByDiamond } from './search_by_diamond';
import type { AnchorSet, SearchByAnchorsResult } from './search_by_anchors';
import type { DiamondVertexQueries, SearchByDiamondResult } from './search_by_diamond';
import type { ExtractDiamondResult } from './extract_diamond';

// ---------------------------------------------------------------------------
// Input modes
// ---------------------------------------------------------------------------

export type CorrelateThreatInput =
  | { mode: 'raw_text'; text: string }
  | { mode: 'report_id'; report_id: string };

// ---------------------------------------------------------------------------
// Output (skeleton — replaced by CorrelationFindings once §5+§6 land)
// ---------------------------------------------------------------------------

/** Retrieval-only partial returned by the skeleton before triage+synthesis. */
export interface CorrelateThreatRetrievalOnlyResult {
  stage: 'retrieval_only';
  merged_candidate_ids: string[];
  anchor_results: SearchByAnchorsResult;
  diamond_results: SearchByDiamondResult;
}

export type CorrelateThreatResult = CorrelateThreatRetrievalOnlyResult;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Request the maximum candidate pool from each retrieval service. */
const RETRIEVAL_POOL_SIZE = 50;

const DIAMOND_VERTICES = ['adversary', 'capability', 'infrastructure', 'victim'] as const;

/** Convert an ExtractDiamondResult into per-vertex free-text queries for searchByDiamond. */
const buildVertexQueries = (diamond: ExtractDiamondResult): DiamondVertexQueries => {
  const queries: DiamondVertexQueries = {};
  for (const v of DIAMOND_VERTICES) {
    const vertex = diamond[v];
    if (vertex.signal !== 'NONE' && vertex.summary) {
      queries[v] = vertex.summary;
    }
  }
  return queries;
};

// ---------------------------------------------------------------------------
// Public service
// ---------------------------------------------------------------------------

/**
 * Phase 3 correlation orchestrator — skeleton.
 *
 * Resolves the input → calls `search_by_anchors` + `search_by_diamond` in
 * parallel → merges + deduplicates candidate IDs → returns a
 * `stage: 'retrieval_only'` partial.
 *
 * Triage (§5) and synthesis (§6) are stubbed; subsequent tasks will replace
 * this return with the full `CorrelationFindings` artifact.
 *
 * Input modes:
 *   - `raw_text`  — runs `extract_iocs` (sync) + `extract_diamond` (LLM) to
 *                   derive anchors and vertex queries; `model` is required.
 *   - `report_id` — passes `source_report_id` to both retrieval services,
 *                   which each fetch the stored fields and self-exclude the
 *                   source report; `model` is unused in this skeleton.
 */
export const correlateThreat = async (
  esClient: ElasticsearchClient,
  model: ScopedModel | undefined,
  logger: Logger,
  spaceId: string,
  input: CorrelateThreatInput
): Promise<CorrelateThreatResult> => {
  let anchorResults: SearchByAnchorsResult;
  let diamondResults: SearchByDiamondResult;

  if (input.mode === 'report_id') {
    // Both services handle source_report_id natively (fetch + self-exclude).
    // Two independent ES reads (one per service) — a future optimisation can
    // fetch once and pass the extracted fields to both.
    [anchorResults, diamondResults] = await Promise.all([
      searchByAnchors(esClient, logger, spaceId, {
        source_report_id: input.report_id,
        size: RETRIEVAL_POOL_SIZE,
      }),
      searchByDiamond(esClient, logger, spaceId, {
        source_report_id: input.report_id,
        size: RETRIEVAL_POOL_SIZE,
      }),
    ]);
  } else {
    if (!model) {
      throw new Error('correlateThreat: raw_text mode requires a resolved ScopedModel');
    }

    // extract_iocs is synchronous — run first, then await extractDiamond.
    const extractedIocs = extractIocs({ text: input.text });
    const diamond = await extractDiamond(model, logger, { text: input.text });

    const vertexQueries = buildVertexQueries(diamond);
    const anchors: AnchorSet = {
      iocs: extractedIocs.iocs.map(({ type, value }) => ({ type, value })),
      ioc_set_hash: extractedIocs.ioc_set_hash,
    };

    [anchorResults, diamondResults] = await Promise.all([
      searchByAnchors(esClient, logger, spaceId, {
        anchors,
        size: RETRIEVAL_POOL_SIZE,
      }),
      searchByDiamond(esClient, logger, spaceId, {
        vertex_queries: vertexQueries,
        size: RETRIEVAL_POOL_SIZE,
      }),
    ]);
  }

  // Merge + dedup candidate IDs across both retrieval surfaces.
  const mergedIds = new Set<string>();
  for (const hit of anchorResults.hits) mergedIds.add(hit.report_id);
  for (const hit of diamondResults.hits) mergedIds.add(hit.report_id);

  logger.debug(
    `[ti:correlate] retrieval complete — mode=${input.mode} ` +
      `anchors=${anchorResults.hits.length} diamond=${diamondResults.hits.length} ` +
      `merged=${mergedIds.size}`
  );

  // §§5–6 (triage → synthesize) are stubbed; return the raw candidate pool.
  return {
    stage: 'retrieval_only',
    merged_candidate_ids: [...mergedIds],
    anchor_results: anchorResults,
    diamond_results: diamondResults,
  };
};
