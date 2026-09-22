/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { HuntIoc } from '@kbn/alertzero-common';
import { HuntIocType } from '@kbn/alertzero-common';
import { HUNT_REPORTS_INDEX } from '../../../../../common/constants';
import { buildHuntSpaceFilterTerms } from './space_filter';

/** What a hunt needs from a threat report: the IOCs and techniques Tier 1 searches for and the text Tier 2 reads. */
export interface ReportHuntContext {
  iocs: HuntIoc[];
  techniques: string[];
  text?: string;
}

interface StoredReportSource {
  content?: { body_text?: string };
  extracted?: {
    iocs?: Array<{ type?: string; value?: string }>;
    ttps?: { techniques?: string[] };
  };
}

const isHuntIoc = (ioc: { type?: string; value?: string }): ioc is HuntIoc =>
  typeof ioc.value === 'string' && ioc.value.length > 0 && HuntIocType.safeParse(ioc.type).success;

/**
 * Loads the hunt inputs for one report from `.kibana-threat-reports`, scoped to
 * the acting space. Returns null when the report is not visible there. IOC
 * kinds Tier 1 cannot map to an ECS field (for example `user`) are dropped.
 */
export const loadReportHuntContext = async ({
  esClient,
  spaceId,
  reportId,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  reportId: string;
}): Promise<ReportHuntContext | null> => {
  const response = await esClient.search<StoredReportSource>({
    index: HUNT_REPORTS_INDEX,
    size: 1,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [buildHuntSpaceFilterTerms(spaceId), { ids: { values: [reportId] } }],
      },
    },
    _source: ['content.body_text', 'extracted.iocs', 'extracted.ttps.techniques'],
  });
  const source = response.hits.hits[0]?._source;
  if (!source) return null;

  const text = source.content?.body_text;
  return {
    iocs: (source.extracted?.iocs ?? [])
      .filter(isHuntIoc)
      .map(({ type, value }) => ({ type, value })),
    techniques: source.extracted?.ttps?.techniques ?? [],
    ...(typeof text === 'string' && text.length > 0 ? { text } : {}),
  };
};
