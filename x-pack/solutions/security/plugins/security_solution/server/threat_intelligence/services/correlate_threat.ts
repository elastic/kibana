/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { THREAT_REPORTS_INDEX_PATTERN } from '../../../common/threat_intelligence/hub';
import { extractIocs } from './extract_iocs';
import { extractDiamond } from './extract_diamond';
import { searchByAnchors } from './search_by_anchors';
import { searchByDiamond } from './search_by_diamond';
import { triageDiamondCandidates } from './triage_diamond_candidates';
import type { AnchorSet, AnchorMatchBreakdown, SearchByAnchorsResult } from './search_by_anchors';
import type { DiamondVertexQueries, SearchByDiamondResult } from './search_by_diamond';
import type { ExtractDiamondResult } from './extract_diamond';
import type {
  QueryDiamond,
  TriageCandidateInput,
  TriagePick,
  TriageGroup,
} from './triage_diamond_candidates';

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

export type CorrelateThreatInput =
  | { mode: 'raw_text'; text: string }
  | { mode: 'report_id'; report_id: string };

export interface CorrelateThreatParams {
  esClient: ElasticsearchClient;
  /** Required for raw_text mode (extractDiamond LLM call). */
  extractionModel: ScopedModel | undefined;
  /** Sonnet-tier model for the triage pass. */
  triageModel: ScopedModel;
  logger: Logger;
  spaceId: string;
  input: CorrelateThreatInput;
  triageFloor: number;
  triageTopN: number;
}

/** Triage-complete partial — synthesis stays stubbed until §6 lands. */
export interface CorrelateThreatTriagedResult {
  stage: 'triage_complete';
  picks: TriagePick[];
  /** Hypothesis groups from triage — diagnostic only. */
  groups: TriageGroup[];
  candidates_fed: number;
  fallback_used: boolean;
  anchor_results: SearchByAnchorsResult;
  diamond_results: SearchByDiamondResult;
}

export type CorrelateThreatResult = CorrelateThreatTriagedResult;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const RETRIEVAL_POOL_SIZE = 50;

const DIAMOND_VERTICES = ['adversary', 'capability', 'infrastructure', 'victim'] as const;

type StoredQueryDiamondSource = {
  extracted?: {
    diamond?: {
      adversary?: { signal?: string; summary?: string };
      capability?: { signal?: string; summary?: string };
      infrastructure?: { signal?: string; summary?: string };
      victim?: { signal?: string; summary?: string };
    };
  };
};

/**
 * Fetches a stored report's diamond (signal + summary per vertex) so the
 * orchestrator has the query case's full diamond for the triage prompt.
 * Returns null when the report is not found.
 */
const fetchQueryDiamond = async (
  esClient: ElasticsearchClient,
  reportId: string
): Promise<QueryDiamond | null> => {
  const response = await esClient.search<StoredQueryDiamondSource>({
    index: THREAT_REPORTS_INDEX_PATTERN,
    size: 1,
    query: { term: { _id: reportId } },
    _source: [
      'extracted.diamond.adversary.signal',
      'extracted.diamond.adversary.summary',
      'extracted.diamond.capability.signal',
      'extracted.diamond.capability.summary',
      'extracted.diamond.infrastructure.signal',
      'extracted.diamond.infrastructure.summary',
      'extracted.diamond.victim.signal',
      'extracted.diamond.victim.summary',
    ],
  });

  const hit = response.hits.hits[0];
  if (!hit?._source) return null;

  const diamond = hit._source.extracted?.diamond ?? {};
  return {
    adversary: { signal: diamond.adversary?.signal ?? 'NONE', summary: diamond.adversary?.summary ?? '' },
    capability: { signal: diamond.capability?.signal ?? 'NONE', summary: diamond.capability?.summary ?? '' },
    infrastructure: { signal: diamond.infrastructure?.signal ?? 'NONE', summary: diamond.infrastructure?.summary ?? '' },
    victim: { signal: diamond.victim?.signal ?? 'NONE', summary: diamond.victim?.summary ?? '' },
  };
};

/** Convert an ExtractDiamondResult into the QueryDiamond shape for the triage prompt. */
const extractResultToQueryDiamond = (result: ExtractDiamondResult): QueryDiamond => ({
  adversary: { signal: result.adversary.signal, summary: result.adversary.summary },
  capability: { signal: result.capability.signal, summary: result.capability.summary },
  infrastructure: { signal: result.infrastructure.signal, summary: result.infrastructure.summary },
  victim: { signal: result.victim.signal, summary: result.victim.summary },
});

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

/**
 * Merges anchor hits and diamond hits into a unified candidate list sorted by
 * (overlap DESC, score DESC).
 *
 * Anchor-only candidates (not in diamond results) are appended with overlap=0,
 * score=0, vertex_scores={}. The `match_breakdown` from anchor results is carried
 * on ALL candidates that appeared in the anchor set (including diamond+anchor
 * candidates) so the triage stage can surface shared hashes/actors as strong
 * signals even when a candidate's diamond vertex scores are low or zero.
 */
const buildMergedCandidates = (
  anchorResults: SearchByAnchorsResult,
  diamondResults: SearchByDiamondResult
): TriageCandidateInput[] => {
  // Index anchor breakdowns by report_id first — used for both diamond+anchor
  // and pure anchor-only candidates.
  const anchorBreakdownMap = new Map<string, AnchorMatchBreakdown>();
  for (const hit of anchorResults.hits) {
    anchorBreakdownMap.set(hit.report_id, hit.match_breakdown);
  }

  const candidateMap = new Map<string, TriageCandidateInput>();
  for (const hit of diamondResults.hits) {
    candidateMap.set(hit.report_id, {
      report_id: hit.report_id,
      title: hit.title,
      overlap: hit.overlap,
      score: hit.score,
      vertex_scores: hit.vertex_scores,
      match_breakdown: anchorBreakdownMap.get(hit.report_id),
    });
  }

  for (const hit of anchorResults.hits) {
    if (!candidateMap.has(hit.report_id)) {
      candidateMap.set(hit.report_id, {
        report_id: hit.report_id,
        title: hit.title,
        overlap: 0,
        score: 0,
        vertex_scores: {},
        match_breakdown: hit.match_breakdown,
      });
    }
  }

  return [...candidateMap.values()].sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return b.score - a.score;
  });
};

// ---------------------------------------------------------------------------
// Public service
// ---------------------------------------------------------------------------

/**
 * Phase 3 correlation orchestrator.
 *
 * Flow: resolve input → search_by_anchors + search_by_diamond in parallel
 * → merge + dedup candidates → triage (§5) → return triage_complete partial.
 * Synthesis (§6) is stubbed; this task will be replaced once §6 lands.
 */
export const correlateThreat = async ({
  esClient,
  extractionModel,
  triageModel,
  logger,
  spaceId,
  input,
  triageFloor,
  triageTopN,
}: CorrelateThreatParams): Promise<CorrelateThreatResult> => {
  let anchorResults: SearchByAnchorsResult;
  let diamondResults: SearchByDiamondResult;
  let queryDiamond: QueryDiamond;

  if (input.mode === 'report_id') {
    const [anchors, diamond, qd] = await Promise.all([
      searchByAnchors(esClient, logger, spaceId, {
        source_report_id: input.report_id,
        size: RETRIEVAL_POOL_SIZE,
      }),
      searchByDiamond(esClient, logger, spaceId, {
        source_report_id: input.report_id,
        size: RETRIEVAL_POOL_SIZE,
      }),
      fetchQueryDiamond(esClient, input.report_id),
    ]);
    anchorResults = anchors;
    diamondResults = diamond;
    queryDiamond = qd ?? {
      adversary: { signal: 'NONE', summary: '' },
      capability: { signal: 'NONE', summary: '' },
      infrastructure: { signal: 'NONE', summary: '' },
      victim: { signal: 'NONE', summary: '' },
    };
  } else {
    if (!extractionModel) {
      throw new Error('correlateThreat: raw_text mode requires a resolved extraction ScopedModel');
    }

    const extractedIocs = extractIocs({ text: input.text });
    const diamondResult = await extractDiamond(extractionModel, logger, { text: input.text });

    queryDiamond = extractResultToQueryDiamond(diamondResult);
    const vertexQueries = buildVertexQueries(diamondResult);
    const anchors: AnchorSet = {
      iocs: extractedIocs.iocs.map(({ type, value }) => ({ type, value })),
      ioc_set_hash: extractedIocs.ioc_set_hash,
    };

    [anchorResults, diamondResults] = await Promise.all([
      searchByAnchors(esClient, logger, spaceId, { anchors, size: RETRIEVAL_POOL_SIZE }),
      searchByDiamond(esClient, logger, spaceId, {
        vertex_queries: vertexQueries,
        size: RETRIEVAL_POOL_SIZE,
      }),
    ]);
  }

  logger.debug(
    `[ti:correlate] retrieval complete — mode=${input.mode} ` +
      `anchors=${anchorResults.hits.length} diamond=${diamondResults.hits.length}`
  );

  const candidates = buildMergedCandidates(anchorResults, diamondResults);

  const triageResult = await triageDiamondCandidates({
    model: triageModel,
    logger,
    esClient,
    queryDiamond,
    candidates,
    confidenceFloor: triageFloor,
    topN: triageTopN,
  });

  // §6 synthesis is stubbed — return triage_complete partial.
  return {
    stage: 'triage_complete',
    picks: triageResult.picks,
    groups: triageResult.groups,
    candidates_fed: triageResult.candidates_fed,
    fallback_used: triageResult.fallback_used,
    anchor_results: anchorResults,
    diamond_results: diamondResults,
  };
};
