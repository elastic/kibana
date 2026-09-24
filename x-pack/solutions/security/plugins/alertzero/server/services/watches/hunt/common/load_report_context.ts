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

/** Matches the OpenAPI `text` maxLength on hunt_behavior / hunt_coordinator. */
export const MAX_HUNT_REPORT_TEXT_CHARS = 200_000;
/** Matches the OpenAPI `iocs` maxItems and `HuntIoc.value` maxLength. */
export const MAX_HUNT_REPORT_IOCS = 100;
const MAX_HUNT_IOC_VALUE_CHARS = 2048;
/** Matches the OpenAPI `techniques` maxItems and item maxLength. */
export const MAX_HUNT_REPORT_TECHNIQUES = 100;
const MAX_HUNT_TECHNIQUE_CHARS = 32;

const isHuntIoc = (ioc: { type?: string; value?: string }): ioc is HuntIoc =>
  typeof ioc.value === 'string' &&
  ioc.value.length > 0 &&
  ioc.value.length <= MAX_HUNT_IOC_VALUE_CHARS &&
  HuntIocType.safeParse(ioc.type).success;

const isHuntTechnique = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_HUNT_TECHNIQUE_CHARS;

/**
 * Loads the hunt inputs for one report from `.kibana-threat-reports`, scoped to
 * the acting space. Returns null when the report is not visible there. IOC
 * kinds Tier 1 cannot map to an ECS field (for example `user`) are dropped.
 * Every loaded field is clamped to the same bounds the HTTP schemas enforce on
 * caller-supplied input (text length, IOC and technique counts and lengths), so
 * a stored report cannot bypass the Tier 1 query or Tier 2 input bounds.
 *
 * `esClient` must be the internal user: the reports index is plugin-owned and
 * hidden, and Kibana feature privileges grant no Elasticsearch access to it, so
 * the calling user's client fails for every non-superuser. The `space_id`
 * filter is the visibility boundary.
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

  const rawText = source.content?.body_text;
  const text =
    typeof rawText === 'string' && rawText.length > 0
      ? rawText.slice(0, MAX_HUNT_REPORT_TEXT_CHARS)
      : undefined;
  return {
    iocs: (source.extracted?.iocs ?? [])
      .filter(isHuntIoc)
      .slice(0, MAX_HUNT_REPORT_IOCS)
      .map(({ type, value }) => ({ type, value })),
    techniques: (source.extracted?.ttps?.techniques ?? [])
      .filter(isHuntTechnique)
      .slice(0, MAX_HUNT_REPORT_TECHNIQUES),
    ...(text !== undefined ? { text } : {}),
  };
};
