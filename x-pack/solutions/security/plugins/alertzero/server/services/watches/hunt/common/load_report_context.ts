/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { HuntIoc } from '@kbn/alertzero-common';
import { HuntIocType, isHuntEligibleIoc } from '@kbn/alertzero-common';
import { HUNT_REPORTS_INDEX } from '../../../../../common/constants';
import { buildHuntSpaceFilterTerms } from './space_filter';
import { MAX_HUNT_TECHNIQUE_IDS } from './hunt_technique_limit';

/** What a hunt needs from a threat report: the IOCs and techniques Tier 1 searches for and the text Tier 2 reads. */
export interface ReportHuntContext {
  iocs: HuntIoc[];
  techniques: string[];
  text?: string;
  /**
   * Searchable report IOCs this run will not hunt because adjudication left them
   * `reference` or `deferred_unreviewed`. `denied` values are not here: that tier
   * means "not an indicator of this kind" (a `.sh` or `.py` token the extractor
   * saw as a domain), not "not evidence", and Tier 2 may still filter on
   * `install.sh`. Present only when at least one such IOC remains after dedupe.
   * `count` is the full deduped set; `values` carries every one within the
   * value-length bound, up to the stored IOC ceiling, since a rejected value
   * missing from the Tier 2 denylist is one the gate would let a query filter
   * on. The prompt caps its own copy.
   */
  excluded_iocs?: { count: number; values: HuntIoc[] };
  /**
   * True when the enrich workflow has not finished with the report: its
   * `lineage.extraction_method` is absent, blank or `pending`, so `extracted.*` is not
   * written yet and a hunt would have nothing to search. `workflow_v4_rejected` is
   * deliberately not pending: a rejected report has been through extraction and must
   * retire.
   */
  extraction_pending: boolean;
  /** Descriptive fields the Investigation narratives cite; absent when the report does not carry them. */
  title?: string;
  source_name?: string;
  published_at?: string;
  severity?: string;
  /**
   * KEV-shaped vendor and product the report names, when the extraction found them.
   * Scope resolution matches them against the datasets present in the hunt universe, so a
   * report about any product can find the indices that hold its telemetry. Only set when
   * the stored value is a non-empty string.
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
  content?: { title?: string; body_text?: string; published_at?: string };
  source?: { name?: string };
  lineage?: { extraction_method?: string };
  severity?: { level?: string };
  extracted?: {
    iocs?: Array<{ type?: string; value?: string; tier?: unknown; deferred_unreviewed?: unknown }>;
    ttps?: { techniques?: string[] };
    vulnerability?: { vendor?: string; product?: string };
  };
}

/** Matches the OpenAPI `text` maxLength on hunt_behavior / hunt_coordinator. */
export const MAX_HUNT_REPORT_TEXT_CHARS = 200_000;
/** Matches the OpenAPI `iocs` maxItems and `HuntIoc.value` maxLength. */
export const MAX_HUNT_REPORT_IOCS = 100;
const MAX_HUNT_IOC_VALUE_CHARS = 2048;
/**
 * Excluded values are a denylist, not a search list, so they are not held to the hunt IOC cap.
 * Matches `MAX_IOCS_PER_REPORT` in the extract_iocs service, the most a stored report holds.
 */
const MAX_HUNT_EXCLUDED_IOCS = 5_000;
const MAX_HUNT_TECHNIQUE_CHARS = 32;
/** A vendor or product name is a short label; anything longer is malformed extraction, not a name. */
const MAX_HUNT_VENDOR_PRODUCT_CHARS = 256;

/**
 * A stored IOC of a kind Tier 1 can map to an ECS field, carrying something to search for.
 * Keeps optional adjudication fields so hunt eligibility can read them after this filter.
 * The value-length bound is deliberately not part of this test: a supported IOC whose value
 * is too long is coverage the run loses and has to report, whereas a kind Tier 1 cannot map
 * is dropped by design and is not a gap. Folding both into one predicate is what let an
 * overlength value disappear from the truncation count.
 */
type SearchableStoredIoc = HuntIoc & { tier?: unknown; deferred_unreviewed?: unknown };

const isSearchableIoc = (ioc: {
  type?: string;
  value?: string;
  tier?: unknown;
  deferred_unreviewed?: unknown;
}): ioc is SearchableStoredIoc =>
  typeof ioc.value === 'string' &&
  ioc.value.trim().length > 0 &&
  HuntIocType.safeParse(ioc.type).success;

const isWithinIocValueBound = ({ value }: HuntIoc): boolean =>
  value.length <= MAX_HUNT_IOC_VALUE_CHARS;

const MAX_REPORT_LABEL_CHARS = 512;

const asLabel = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0
    ? value.slice(0, MAX_REPORT_LABEL_CHARS)
    : undefined;

const isHuntTechnique = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_HUNT_TECHNIQUE_CHARS;

/** A stored vendor or product label, or undefined when it is absent, blank, or not a string. */
const readVendorProduct = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, MAX_HUNT_VENDOR_PRODUCT_CHARS) : undefined;
};

/**
 * Loads the hunt inputs for one report from `.kibana-threat-reports`, scoped to
 * the acting space. Returns null when the report is not visible there. IOC
 * kinds Tier 1 cannot map to an ECS field (for example `user`) are dropped.
 * Adjudicated-out IOCs (`reference`, `denied`, deferred) are also dropped from
 * `iocs` and reported on `excluded_iocs` when any remain. Every loaded field is
 * clamped to the same bounds the HTTP schemas enforce on caller-supplied input
 * (text length, IOC and technique counts and lengths), so a stored report
 * cannot bypass the Tier 1 query or Tier 2 input bounds.
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
      'content.published_at',
      'content.title',
      'content.body_text',
      'source.name',
      'severity.level',
      'lineage.extraction_method',
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
  const eligibleSearchableIocs = searchableIocs.filter(isHuntEligibleIoc);
  // `denied` is dropped from the hunt but not denylisted: it is an extraction verdict on the
  // IOC kind, and the value itself (`install.sh`, `loader.py`) may be the artifact Tier 2
  // should filter on. Only a model rejection (`reference`) or a pending review is excluded.
  const ineligibleSearchableIocs = searchableIocs.filter(
    (ioc) => !isHuntEligibleIoc(ioc) && ioc.tier !== 'denied'
  );
  const mappableIocs = eligibleSearchableIocs.filter(isWithinIocValueBound);
  const oversizedIocs = eligibleSearchableIocs.length - mappableIocs.length;
  const eligibleKeys = new Set(eligibleSearchableIocs.map((ioc) => `${ioc.type}:${ioc.value}`));
  const dedupedIneligible: HuntIoc[] = [];
  const seenIneligible = new Set<string>();
  for (const ioc of ineligibleSearchableIocs) {
    const key = `${ioc.type}:${ioc.value}`;
    if (eligibleKeys.has(key) || seenIneligible.has(key)) {
      continue;
    }
    seenIneligible.add(key);
    dedupedIneligible.push({ type: ioc.type, value: ioc.value });
  }
  const excludedIocs =
    dedupedIneligible.length > 0
      ? {
          count: dedupedIneligible.length,
          values: dedupedIneligible
            .filter(isWithinIocValueBound)
            .slice(0, MAX_HUNT_EXCLUDED_IOCS)
            .map(({ type, value }) => ({ type, value })),
        }
      : undefined;
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
    ...(validTechniques.length > MAX_HUNT_TECHNIQUE_IDS && {
      techniques: {
        kept: MAX_HUNT_TECHNIQUE_IDS,
        dropped: validTechniques.length - MAX_HUNT_TECHNIQUE_IDS,
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

  const title = asLabel(source.content?.title);
  const sourceName = asLabel(source.source?.name);
  // Publication date only. Ingest time is not a fallback: showing it as "Published" is the
  // defect, and candidate selection keeps its own fallback for reports without a date.
  const publishedAt = asLabel(source.content?.published_at);
  const severity = asLabel(source.severity?.level);
  const method =
    typeof source.lineage?.extraction_method === 'string'
      ? source.lineage.extraction_method.trim()
      : '';
  const extractionPending = method.length === 0 || method === 'pending';
  return {
    extraction_pending: extractionPending,
    ...(title !== undefined ? { title } : {}),
    ...(sourceName !== undefined ? { source_name: sourceName } : {}),
    ...(publishedAt !== undefined ? { published_at: publishedAt } : {}),
    ...(severity !== undefined ? { severity } : {}),
    iocs: mappableIocs.slice(0, MAX_HUNT_REPORT_IOCS).map(({ type, value }) => ({ type, value })),
    techniques: validTechniques.slice(0, MAX_HUNT_TECHNIQUE_IDS),
    ...(text !== undefined ? { text } : {}),
    ...(vendor !== undefined ? { vendor } : {}),
    ...(product !== undefined ? { product } : {}),
    ...(excludedIocs !== undefined ? { excluded_iocs: excludedIocs } : {}),
    ...(Object.keys(truncated).length > 0 ? { truncated } : {}),
  };
};
