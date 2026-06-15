/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { CostTraceBuilder } from '../routes/lib/cost_tracker';
import { THREAT_REPORTS_INDEX_PATTERN } from '../../../common/threat_intelligence/hub';
import type { CorrelationFindings } from '../../../common/threat_intelligence/correlation/schemas';
import { extractIocs } from './extract_iocs';
import { extractDiamond } from './extract_diamond';
import { searchByAnchors } from './search_by_anchors';
import { searchByDiamond } from './search_by_diamond';
import { triageDiamondCandidates } from './triage_diamond_candidates';
import { keywordGapFill } from './keyword_gap_fill';
import { collapseCandidates } from './collapse_candidates';
import { synthesizeCorrelations } from './synthesize_correlations';
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
  /** Opus-tier model for the §6 synthesis pass. */
  synthesisModel: ScopedModel;
  logger: Logger;
  spaceId: string;
  input: CorrelateThreatInput;
  triageFloor: number;
  triageTopN: number;
}

/**
 * Triage-complete diagnostic envelope — preserved for testing and
 * future diagnostic endpoints; no longer the primary return type of
 * correlateThreat now that §6 synthesis is wired in.
 */
export interface CorrelateThreatTriagedResult {
  stage: 'triage_complete';
  picks: TriagePick[];
  /** Hypothesis groups from triage — diagnostic only. */
  groups: TriageGroup[];
  candidates_fed: number;
  fallback_used: boolean;
  anchor_results: SearchByAnchorsResult;
  diamond_results: SearchByDiamondResult;
  /** Candidates added by the keyword gap-fill pass (§3). */
  gap_fill_added: number;
  /** Candidates removed by the deterministic collapse pass (§4). */
  collapsed_count: number;
}

/** Full correlation findings produced by the §6 synthesis pass. */
export type CorrelateThreatResult = CorrelationFindings;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const RETRIEVAL_POOL_SIZE = 50;

const DIAMOND_VERTICES_ORDERED = ['adversary', 'capability', 'infrastructure', 'victim'] as const;

/**
 * Builds the case-context string fed to keyword gap-fill.
 * For raw_text mode the caller supplies the text directly.
 * For report_id mode we concatenate non-NONE diamond vertex summaries so the
 * gap-fill LLM has enough named-entity context without a second ES fetch.
 */
const buildCaseContextFromDiamond = (qd: QueryDiamond): string => {
  const parts: string[] = [];
  for (const v of DIAMOND_VERTICES_ORDERED) {
    const vd = qd[v];
    if (vd.signal !== 'NONE' && vd.summary) {
      parts.push(`[${v.toUpperCase()}]\n${vd.summary}`);
    }
  }
  return parts.join('\n\n');
};

const DIAMOND_VERTICES = ['adversary', 'capability', 'infrastructure', 'victim'] as const;

/** Maps stored uppercase diamond signal values to the output enum. */
const mapDiamondSignal = (signal: string): 'high' | 'partial' | 'none' => {
  if (signal === 'HIGH') return 'high';
  if (signal === 'PARTIAL') return 'partial';
  return 'none';
};

interface CandidateMetaSource {
  content?: { title?: string };
  source?: { name?: string; url?: string };
}

/**
 * Lightweight fetch of display metadata (title, vendor, URL) for a set of
 * candidate doc IDs. Called after synthesis so only IDs that appear in the
 * final output are fetched — avoids over-fetching the full candidate pool.
 */
const fetchCandidateMeta = async (
  esClient: ElasticsearchClient,
  ids: readonly string[]
): Promise<Record<string, { title?: string; vendor?: string; url?: string }>> => {
  if (ids.length === 0) return {};
  const response = await esClient.search<CandidateMetaSource>({
    index: THREAT_REPORTS_INDEX_PATTERN,
    size: ids.length + 5,
    query: { ids: { values: [...ids] } },
    _source: ['content.title', 'source.name', 'source.url'],
    ignore_unavailable: true,
  });
  const result: Record<string, { title?: string; vendor?: string; url?: string }> = {};
  for (const hit of response.hits.hits) {
    if (hit._id) {
      result[hit._id] = {
        title: hit._source?.content?.title,
        vendor: hit._source?.source?.name,
        url: hit._source?.source?.url,
      };
    }
  }
  return result;
};

/**
 * Fetches the full body text of a stored report for use as the synthesis
 * case context in report_id mode. Falls back to undefined if not found so
 * the orchestrator can substitute the diamond-summary proxy.
 */
const fetchSourceBodyText = async (
  esClient: ElasticsearchClient,
  reportId: string
): Promise<string | undefined> => {
  const response = await esClient.search<{ content?: { body_text?: string } }>({
    index: THREAT_REPORTS_INDEX_PATTERN,
    size: 1,
    query: { term: { _id: reportId } },
    _source: ['content.body_text'],
  });
  return response.hits.hits[0]?._source?.content?.body_text ?? undefined;
};

interface StoredQueryDiamondSource {
  extracted?: {
    diamond?: {
      adversary?: { signal?: string; summary?: string };
      capability?: { signal?: string; summary?: string };
      infrastructure?: { signal?: string; summary?: string };
      victim?: { signal?: string; summary?: string };
    };
  };
}

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
    adversary: {
      signal: diamond.adversary?.signal ?? 'NONE',
      summary: diamond.adversary?.summary ?? '',
    },
    capability: {
      signal: diamond.capability?.signal ?? 'NONE',
      summary: diamond.capability?.summary ?? '',
    },
    infrastructure: {
      signal: diamond.infrastructure?.signal ?? 'NONE',
      summary: diamond.infrastructure?.summary ?? '',
    },
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
 * Correlation orchestrator — phases 1–6.
 *
 * Flow: resolve input → search_by_anchors + search_by_diamond in parallel
 * → merge + dedup candidates → keyword gap-fill (§3) → collapse (§4)
 * → triage (§5) → synthesize_correlations (§6) → CorrelationFindings.
 */
export const correlateThreat = async ({
  esClient,
  extractionModel,
  triageModel,
  synthesisModel,
  logger,
  spaceId,
  input,
  triageFloor,
  triageTopN,
}: CorrelateThreatParams): Promise<CorrelateThreatResult> => {
  const traceBuilder = new CostTraceBuilder();

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
    const diamondResult = await extractDiamond(extractionModel, logger, {
      text: input.text,
      traceBuilder,
    });

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

  const merged = buildMergedCandidates(anchorResults, diamondResults);

  // §3 Keyword gap-fill — extend pool with candidates covering named entities
  // not represented in the diamond/anchor retrieval results.
  const caseContext =
    input.mode === 'raw_text' ? input.text : buildCaseContextFromDiamond(queryDiamond);

  const sourceReportId = input.mode === 'report_id' ? input.report_id : undefined;

  const gapFillCandidates = await keywordGapFill({
    model: triageModel,
    esClient,
    logger,
    caseContext,
    currentPool: merged,
    sourceReportId,
    spaceId,
    traceBuilder,
  });

  const extended: TriageCandidateInput[] =
    gapFillCandidates.length > 0 ? [...merged, ...gapFillCandidates] : merged;

  logger.debug(
    `[ti:correlate] gap-fill added ${gapFillCandidates.length} candidate(s), ` +
      `pool=${extended.length}`
  );

  // §4 Dedup-collapse — collapse exact ioc_set_hash duplicates and bilingual
  // sibling URL variants before spending the triage LLM.
  const preCollapseCount = extended.length;
  const collapsed = await collapseCandidates(esClient, extended);
  const collapsedCount = preCollapseCount - collapsed.length;

  logger.debug(
    `[ti:correlate] collapse removed ${collapsedCount} candidate(s), pool=${collapsed.length}`
  );

  // §5 Triage — CollapsedCandidate extends TriageCandidateInput; triage
  // ignores the extra collapsed_members field.
  const triageResult = await triageDiamondCandidates({
    model: triageModel,
    logger,
    esClient,
    queryDiamond,
    candidates: collapsed,
    confidenceFloor: triageFloor,
    topN: triageTopN,
    traceBuilder,
  });

  // §6 Synthesis — build case text and call synthesize_correlations.
  // For report_id mode we attempt to fetch the full source body text so the
  // synthesis model receives the same quality input as raw_text mode.
  // Falls back to the diamond-vertex proxy if body_text is absent.
  const caseText =
    input.mode === 'raw_text'
      ? input.text
      : (await fetchSourceBodyText(esClient, input.report_id)) ??
        buildCaseContextFromDiamond(queryDiamond);

  const findings = await synthesizeCorrelations({
    synthesisModel,
    logger,
    esClient,
    picks: triageResult.picks,
    collapsed,
    caseText,
    traceBuilder,
  });
  const caseVertexSignal = {
    adversary: mapDiamondSignal(queryDiamond.adversary.signal),
    capability: mapDiamondSignal(queryDiamond.capability.signal),
    infrastructure: mapDiamondSignal(queryDiamond.infrastructure.signal),
    victim: mapDiamondSignal(queryDiamond.victim.signal),
  };

  const outputIds = new Set<string>();
  for (const lead of findings.leads) {
    for (const id of lead.candidate_ids) outputIds.add(id);
  }
  for (const nm of findings.no_match) {
    outputIds.add(nm.id);
  }
  const candidateMeta =
    outputIds.size > 0 ? await fetchCandidateMeta(esClient, [...outputIds]) : undefined;

  return {
    ...findings,
    trace: traceBuilder.build(),
    case_vertex_signal: caseVertexSignal,
    candidate_meta: candidateMeta,
  };
};
