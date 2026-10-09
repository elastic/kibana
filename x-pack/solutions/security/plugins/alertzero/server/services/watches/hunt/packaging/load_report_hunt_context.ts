/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/**
 * Reads a slice of the threat report (title, severity, extracted techniques / IOCs /
 * vendor / product, body text) for the coverage KI's prose and no-hit
 * `threat_summary` / severity preference. Queries `.kibana-threat-reports*` directly, the same
 * self-contained style `write_coverage_kis.ts` uses for the coverage index, rather than depending
 * on `security_solution`'s threat_intel service: that service's `getThreatReport` is not exposed
 * through a public plugin contract, and `alertzero` declares no dependency on `securitySolution`
 * today. `SEVERITY_LEVELS` in `common/attachment_enums.ts` is the same local-duplication
 * precedent for this report's shape.
 *
 * Takes the *internal* ES client, not the step's scoped client: `.kibana-threat-reports` is
 * plugin-owned and hidden, and the hunt worker's service-account role grants it no privilege at
 * all (see `write_hunt_evidence.ts`'s identical note), so a wildcard search on the scoped client
 * silently resolves to zero matched indices -- no error, just an empty result -- rather than a
 * 403. That degrades indistinguishably from a genuinely missing report, which is why this was
 * hard to tell apart from the no-hit fallback it was supposed to enrich.
 */

const THREAT_REPORTS_INDEX_PATTERN = '.kibana-threat-reports*' as const;
/** Mirrors `security_solution`'s `GLOBAL_SPACE_ID` sentinel for seeded/global reports. */
const GLOBAL_SPACE_ID = '*' as const;

/** Most extracted IOCs the loader hands back; callers cap further for display. */
const MAX_LOADED_IOCS = 50;

export interface ReportIoc {
  type: string;
  value: string;
}

export interface ReportHuntContext {
  title?: string;
  severity?: string;
  /** `extracted.ttps.techniques` ids, as stored. */
  techniques?: string[];
  /** `extracted.iocs` with a type and a value, capped at {@link MAX_LOADED_IOCS}. */
  iocs?: ReportIoc[];
  vendor?: string;
  product?: string;
  /** Full `content.body_text`; callers slice it for the field they fill. */
  bodyText?: string;
}

/** The slice of the ES client this loader uses. */
export interface EsReportContextClient {
  search: (params: {
    index: string;
    size: number;
    query: Record<string, unknown>;
  }) => Promise<{ hits: { hits: Array<{ _source?: Record<string, unknown> }> } }>;
}

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];

const asIocs = (value: unknown): ReportIoc[] =>
  Array.isArray(value)
    ? value
        .filter(
          (item): item is ReportIoc =>
            typeof item?.type === 'string' &&
            item.type.length > 0 &&
            typeof item?.value === 'string' &&
            item.value.length > 0
        )
        .slice(0, MAX_LOADED_IOCS)
        .map(({ type, value: iocValue }) => ({ type, value: iocValue }))
    : [];

/**
 * Best-effort threat report load for the no-hit coverage subject path. Never throws: a report
 * that is missing, inaccessible, or a client failure all resolve to `undefined`, so a lookup
 * problem degrades to the SSE/synthetic fallback instead of failing packaging.
 */
export const loadReportHuntContext = async ({
  esClient,
  spaceId,
  reportId,
  logger,
}: {
  esClient: EsReportContextClient;
  spaceId: string;
  reportId: string;
  logger?: Logger;
}): Promise<ReportHuntContext | undefined> => {
  try {
    const response = await esClient.search({
      index: THREAT_REPORTS_INDEX_PATTERN,
      size: 1,
      query: {
        bool: {
          filter: [
            { ids: { values: [reportId] } },
            { terms: { space_id: [spaceId, GLOBAL_SPACE_ID] } },
          ],
        },
      },
    });

    const source = response.hits.hits[0]?._source;
    if (!source) {
      return undefined;
    }

    // Mirrors the seeded/ingested report shape: title lives under `content.title`, severity
    // under `severity.level` (an object carrying both a label and a numeric score).
    const content = source.content as Record<string, unknown> | undefined;
    const severityField = source.severity as Record<string, unknown> | undefined;
    const title = typeof content?.title === 'string' ? content.title : undefined;
    const severity = typeof severityField?.level === 'string' ? severityField.level : undefined;
    const bodyText =
      typeof content?.body_text === 'string' && content.body_text.trim().length > 0
        ? content.body_text
        : undefined;

    const extracted = source.extracted as Record<string, unknown> | undefined;
    const ttps = extracted?.ttps as Record<string, unknown> | undefined;
    const techniques = asStringArray(ttps?.techniques);
    const iocs = asIocs(extracted?.iocs);
    const vulnerability = extracted?.vulnerability as Record<string, unknown> | undefined;
    const vendor = asNonEmptyString(vulnerability?.vendor);
    const product = asNonEmptyString(vulnerability?.product);

    if (title === undefined && severity === undefined && bodyText === undefined) {
      return undefined;
    }
    return {
      title,
      severity,
      ...(techniques.length > 0 ? { techniques } : {}),
      ...(iocs.length > 0 ? { iocs } : {}),
      ...(vendor ? { vendor } : {}),
      ...(product ? { product } : {}),
      ...(bodyText ? { bodyText } : {}),
    };
  } catch (error) {
    logger?.warn(
      `Hunt packaging could not load threat report ${reportId} for the coverage KI: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};
