/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createHash } from 'crypto';
import type { AnchorItem, HuntCorrelationAttachmentData } from '@kbn/alertzero-common';
import { searchByAnchors, EMPTY_ANCHOR_SUMMARY } from './search_by_anchors';
import type {
  AnchorSet,
  CorrelationEngineResult,
  SearchByAnchorsParams,
  SearchByAnchorsResult,
} from './types';

const DISCRIMINATING_MIN = 1;

/**
 * Thresholds for the `anchor_match` and `diamond_vertex` fields in the
 * correlation attachment. `anchor_match` is pinned to 1.0 because the gate
 * is binary: discriminating anchors either match or they don't. `diamond_vertex`
 * is a placeholder pending real diamond scoring.
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
 * Mirrors the `sse-{sha256(...)}` convention in `sse_mapper.ts`. Unlike the SSE
 * id, correlation has no technique dimension: one pass produces at most one
 * attachment per report.
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
): Promise<CorrelationEngineResult & { attachment_data: HuntCorrelationAttachmentData }> => {
  let searchResult: SearchByAnchorsResult | undefined;
  try {
    searchResult = await searchByAnchors(esClient, logger, spaceId, searchParams);
  } catch (err) {
    logger.warn(`correlation_engine: searchByAnchors failed — ${(err as Error).message}`);
  }

  const anchors = searchParams.anchors ?? {};
  const status: CorrelationEngineResult['status'] = !searchResult
    ? 'unavailable'
    : searchResult.hits.length > 0
    ? 'matched'
    : 'no_match';
  const resolvedResult = searchResult ?? {
    hits: [],
    total: 0,
    anchor_summary: EMPTY_ANCHOR_SUMMARY,
  };
  const anchorItems = buildAnchorItems(anchors);

  return {
    status,
    anchors,
    matches: resolvedResult.hits,
    thresholds: { discriminating_min: DISCRIMINATING_MIN },
    self_match_excluded: true,
    diamond_scores: [],
    anchor_summary: resolvedResult.anchor_summary,
    attachment_data: {
      attachment_id: buildCorrAttachmentId({
        spaceId,
        reportId: searchParams.source_report_id ?? '',
      }),
      anchors: status === 'unavailable' ? [] : anchorItems,
      diamond_scores: [],
      thresholds: {
        anchor_match: ANCHOR_MATCH_THRESHOLD,
        diamond_vertex: DIAMOND_VERTEX_THRESHOLD,
      },
      self_match_excluded: true,
      report_revision: reportRevision,
    },
  };
};
