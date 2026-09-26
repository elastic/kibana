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
  /**
   * KEV-shaped vendor and product the report names, when the extraction found them.
   * Scope resolution matches them against the datasets present in the space, so a report
   * about a product no known technology covers can still find the indices that hold its
   * telemetry. Only set when the stored value is a non-empty string.
   */
  vendor?: string;
  product?: string;
  /**
   * What the bounds below dropped, so the run can report the part of the report it
   * never looked at. Silently hunting a prefix is the failure mode: an IOC past the
   * limit reads exactly like an IOC that was searched and found nothing, and the
   * caller retires the report as hunted on that basis.
   */
  truncated?: {
    /**
     * `dropped` counts IOCs lost to the count bound, `oversized` those lost to the
     * value-length bound. Both are coverage the run did not have; they are separated only
     * so it can say which happened, since neither is fixed by hunting the report again.
     */
    iocs?: { kept: number; dropped: number; oversized?: number };
    techniques?: { kept: number; dropped: number };
    text?: { kept: number; dropped: number };
  };
}

interface StoredReportSource {
  content?: { body_text?: string };
  extracted?: {
    iocs?: Array<{ type?: string; value?: string }>;
    ttps?: { techniques?: string[] };
    vulnerability?: { vendor?: string; product?: string };
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
/** A vendor or product name is a short label; anything longer is malformed extraction, not a name. */
const MAX_HUNT_VENDOR_PRODUCT_CHARS = 256;

/**
 * A stored IOC of a kind Tier 1 can map to an ECS field, carrying something to search for.
 * The value-length bound is deliberately not part of this test: a supported IOC whose value
 * is too long is coverage the run loses and has to report, whereas a kind Tier 1 cannot map
 * is dropped by design and is not a gap. Folding both into one predicate is what let an
 * overlength value disappear from the truncation count.
 */
const isSearchableIoc = (ioc: { type?: string; value?: string }): ioc is HuntIoc =>
  typeof ioc.value === 'string' &&
  ioc.value.trim().length > 0 &&
  HuntIocType.safeParse(ioc.type).success;

const isWithinIocValueBound = ({ value }: HuntIoc): boolean =>
  value.length <= MAX_HUNT_IOC_VALUE_CHARS;

const isHuntTechnique = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_HUNT_TECHNIQUE_CHARS;

/** A stored vendor or product label, or undefined when it is absent, blank, or not a string. */
const readVendorProduct = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0
    ? value.slice(0, MAX_HUNT_VENDOR_PRODUCT_CHARS)
    : undefined;

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
    _source: [
      'content.body_text',
      'extracted.iocs',
      'extracted.ttps.techniques',
      'extracted.vulnerability.vendor',
      'extracted.vulnerability.product',
    ],
  });
  const source = response.hits.hits[0]?._source;
  if (!source) return null;

  const rawText = source.content?.body_text;
  const hasText = typeof rawText === 'string' && rawText.length > 0;
  const text = hasText ? rawText.slice(0, MAX_HUNT_REPORT_TEXT_CHARS) : undefined;
  const vendor = readVendorProduct(source.extracted?.vulnerability?.vendor);
  const product = readVendorProduct(source.extracted?.vulnerability?.product);

  // Counted before the bounds are applied, and only over values that survived
  // validation: an IOC kind Tier 1 cannot map is dropped by design and is not lost
  // coverage, whereas one pushed past a limit is — by either limit, the count or the
  // value length. An overlength technique id is malformed rather than lost, since a real
  // ATT&CK id is a third of the bound, so those stay uncounted.
  const searchableIocs = (source.extracted?.iocs ?? []).filter(isSearchableIoc);
  const mappableIocs = searchableIocs.filter(isWithinIocValueBound);
  const oversizedIocs = searchableIocs.length - mappableIocs.length;
  const validTechniques = (source.extracted?.ttps?.techniques ?? []).filter(isHuntTechnique);

  const keptIocs = Math.min(mappableIocs.length, MAX_HUNT_REPORT_IOCS);
  const truncated = {
    ...((mappableIocs.length > keptIocs || oversizedIocs > 0) && {
      iocs: {
        kept: keptIocs,
        dropped: mappableIocs.length - keptIocs,
        ...(oversizedIocs > 0 && { oversized: oversizedIocs }),
      },
    }),
    ...(validTechniques.length > MAX_HUNT_REPORT_TECHNIQUES && {
      techniques: {
        kept: MAX_HUNT_REPORT_TECHNIQUES,
        dropped: validTechniques.length - MAX_HUNT_REPORT_TECHNIQUES,
      },
    }),
    ...(hasText &&
      rawText.length > MAX_HUNT_REPORT_TEXT_CHARS && {
        text: {
          kept: MAX_HUNT_REPORT_TEXT_CHARS,
          dropped: rawText.length - MAX_HUNT_REPORT_TEXT_CHARS,
        },
      }),
  };

  return {
    iocs: mappableIocs.slice(0, MAX_HUNT_REPORT_IOCS).map(({ type, value }) => ({ type, value })),
    techniques: validTechniques.slice(0, MAX_HUNT_REPORT_TECHNIQUES),
    ...(text !== undefined ? { text } : {}),
    ...(vendor !== undefined ? { vendor } : {}),
    ...(product !== undefined ? { product } : {}),
    ...(Object.keys(truncated).length > 0 ? { truncated } : {}),
  };
};
