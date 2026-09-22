/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createHash } from 'crypto';
import { searchByAnchors } from './search_by_anchors';
import type {
  AnchorItem,
  AnchorSet,
  CorrelationEngineResult,
  HuntCorrelationAttachmentData,
  SearchByAnchorsParams,
} from './types';

const DISCRIMINATING_MIN = 1;

/**
 * Attachment-facing thresholds (`security.hunt_correlation`'s
 * `anchor_match`/`diamond_vertex`, PR 1 kibana#291882). `anchor_match` is
 * pinned to 1.0 here because this phase's gate is binary — the anchors
 * search either returns discriminating matches or doesn't, there is no
 * partial-credit anchor score yet. `diamond_vertex` is a placeholder until
 * PR 3b's diamond leg actually produces `diamond_scores`; that phase should
 * revisit this constant alongside its scoring, not invent a new field.
 */
const ANCHOR_MATCH_THRESHOLD = 1;
const DIAMOND_VERTEX_THRESHOLD = 0.5;

const buildAnchorItems = (anchors: AnchorSet): AnchorItem[] => {
  const items: AnchorItem[] = [];
  for (const ioc of anchors.iocs ?? []) {
    if (ioc.type === 'hash') {
      items.push({ kind: 'hash', value: ioc.value });
    }
  }
  if (anchors.ioc_set_hash) {
    items.push({ kind: 'ioc_set_hash', value: anchors.ioc_set_hash });
  }
  for (const actor of anchors.actors ?? []) {
    items.push({ kind: 'actor', value: actor });
  }
  return items;
};

/**
 * Subject-stable correlation attachment id: `corr-{sha256(space|reportId)}`.
 * Matches the `trigger-{sha256(space|reportId)}` / `sse-{sha256(...)}`
 * convention (`sse_mapper.ts`'s `buildSseAttachmentId`, `mvp-slice.md`).
 * Unlike the SSE id, correlation has no technique dimension: one correlation
 * pass produces at most one attachment per report.
 */
export const buildCorrAttachmentId = ({
  spaceId,
  reportId,
}: {
  spaceId: string;
  reportId: string;
}): string => {
  const hash = createHash('sha256').update(`${spaceId}|${reportId}`).digest('hex');
  return `corr-${hash}`;
};

export const runCorrelationEngine = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  spaceId: string,
  searchParams: SearchByAnchorsParams,
  reportRevision: string = ''
): Promise<CorrelationEngineResult & { toAttachmentData: () => HuntCorrelationAttachmentData }> => {
  let searchResult;
  try {
    searchResult = await searchByAnchors(esClient, logger, spaceId, searchParams);
  } catch (err) {
    logger.warn(`correlation_engine: searchByAnchors failed — ${(err as Error).message}`);
    const emptyAnchors = searchParams.anchors ?? {};
    return {
      status: 'unavailable',
      anchors: emptyAnchors,
      matches: [],
      thresholds: { discriminating_min: DISCRIMINATING_MIN },
      self_match_excluded: true,
      diamond_scores: [],
      anchor_summary: {
        hash_ioc_count: 0,
        network_ioc_count: 0,
        ioc_set_hash: null,
        actor_count: 0,
        technique_count: 0,
        discriminating_anchor_count: 0,
      },
      toAttachmentData: () => ({
        attachment_id: buildCorrAttachmentId({
          spaceId,
          reportId: searchParams.source_report_id ?? '',
        }),
        anchors: [],
        diamond_scores: [],
        thresholds: {
          anchor_match: ANCHOR_MATCH_THRESHOLD,
          diamond_vertex: DIAMOND_VERTEX_THRESHOLD,
        },
        self_match_excluded: true,
        report_revision: reportRevision,
      }),
    };
  }

  const anchors = searchParams.anchors ?? {};
  const status: CorrelationEngineResult['status'] =
    searchResult.hits.length > 0 ? 'matched' : 'no_match';

  const anchorItems = buildAnchorItems(anchors);

  return {
    status,
    anchors,
    matches: searchResult.hits,
    thresholds: { discriminating_min: DISCRIMINATING_MIN },
    self_match_excluded: true,
    diamond_scores: [], // Empty until PR 3b's diamond phase.
    anchor_summary: searchResult.anchor_summary,
    toAttachmentData: (): HuntCorrelationAttachmentData => ({
      attachment_id: buildCorrAttachmentId({
        spaceId,
        reportId: searchParams.source_report_id ?? '',
      }),
      anchors: anchorItems,
      diamond_scores: [], // Empty until PR 3b's diamond phase.
      thresholds: {
        anchor_match: ANCHOR_MATCH_THRESHOLD,
        diamond_vertex: DIAMOND_VERTEX_THRESHOLD,
      },
      self_match_excluded: true,
      report_revision: reportRevision,
    }),
  };
};
