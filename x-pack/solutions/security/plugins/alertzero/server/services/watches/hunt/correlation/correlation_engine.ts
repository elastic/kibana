/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { searchByAnchors } from './search_by_anchors';
import type {
  AnchorItem,
  AnchorSet,
  CorrelationEngineResult,
  HuntCorrelationAttachmentData,
  SearchByAnchorsParams,
} from './types';

const DISCRIMINATING_MIN = 1;

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
        anchors: [],
        diamond_scores: [],
        thresholds: { discriminating_min: DISCRIMINATING_MIN },
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
      anchors: anchorItems,
      diamond_scores: [],
      thresholds: { discriminating_min: DISCRIMINATING_MIN },
      self_match_excluded: true,
      report_revision: reportRevision,
    }),
  };
};
