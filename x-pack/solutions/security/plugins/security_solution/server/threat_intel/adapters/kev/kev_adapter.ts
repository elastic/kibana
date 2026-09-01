/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchUrlForContext, redactUrl } from '../http_client';
import { buildFingerprint } from '../fingerprint';
import { severityScore } from '../../services/severity';
import { buildReportContent } from '../../services/report_content';
import { normalizeProvenanceUrl } from '../../services/provenance_url';
import type { FetchAdapter, NormalizedReport, SourceHit, AdapterRunContext } from '../types';

/**
 * Every field `buildKevReport` reads, not just the identity ones.
 *
 * The gate used to check `cveID`, `vendorProject`, `product`, and `vulnerabilityName`
 * only, while the report body interpolates `shortDescription` and `requiredAction` and
 * `normalizedReportSchema` requires `date_added` and `due_date`. A custom or
 * temporarily malformed KEV feed missing any of those produced a report with the string
 * `undefined` in its body and a missing required field, which fails output validation
 * for the whole step rather than skipping the one bad entry.
 */
const isCompleteKevEntry = (vuln: KevVulnerability): boolean =>
  Boolean(
    vuln.cveID &&
      vuln.vendorProject &&
      vuln.product &&
      vuln.vulnerabilityName &&
      vuln.shortDescription &&
      vuln.requiredAction &&
      vuln.dateAdded &&
      vuln.dueDate
  );

const KEV_FEED_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

// CISA returns 403 to the default Kibana UA. A browser-style UA is required.
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

interface KevVulnerability {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse?: string;
  notes?: string;
  cwes?: string[];
}

interface KevEnvelope {
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: KevVulnerability[];
}

const readFeedUrl = (source: SourceHit): string => {
  const url = source._source.config.url;
  return typeof url === 'string' && url.length > 0 ? url : KEV_FEED_URL;
};

const buildKevReport = (
  vuln: KevVulnerability,
  provenanceUrl: string | undefined,
  ingestedAt: string,
  spaceId: string,
  sourceId: string
): NormalizedReport => {
  const bodyText = `${vuln.shortDescription}\n\nRequired Action: ${vuln.requiredAction}`;

  return {
    '@timestamp': ingestedAt,
    // The CVE id alone is stable for the life of the entry, so fingerprinting on
    // it would dedup away every later CISA revision. Include the mutable fields
    // so a changed due date, required action, ransomware status, or description
    // produces a new fingerprint and is re-ingested.
    content_fingerprint: buildFingerprint([
      vuln.cveID,
      vuln.vulnerabilityName,
      vuln.shortDescription,
      vuln.requiredAction,
      vuln.dueDate,
      vuln.knownRansomwareCampaignUse,
      vuln.notes,
      (vuln.cwes ?? []).join(','),
    ]),
    space_id: spaceId,
    source: {
      type: 'kev',
      name: 'CISA Known Exploited Vulnerabilities',
      ...(provenanceUrl ? { url: provenanceUrl } : {}),
      // Identifies the *source*, not the item, matching every other adapter
      // (`<type>:<source doc id>`). list_sources aggregates report activity on
      // this field, so a per-CVE value would leave the KEV catalog row with no
      // stats. The CVE identity lives in lineage.source_doc_ref.id below and in
      // extracted.vulnerability.cve_id.
      adapter_id: `kev:${sourceId}`,
    },
    content: buildReportContent({ title: vuln.vulnerabilityName, bodyText, language: 'en' }),
    severity: {
      level: 'high',
      score: severityScore('high'),
    },
    lineage: {
      ingested_at: ingestedAt,
      extraction_method: 'kev',
      extracted_at: ingestedAt,
      source_doc_ref: { index: 'cisa:kev', id: vuln.cveID },
    },
    extracted: {
      categories: ['vulnerability'],
      vulnerability: {
        cve_id: vuln.cveID,
        vendor: vuln.vendorProject,
        product: vuln.product,
        name: vuln.vulnerabilityName,
        cwes: vuln.cwes,
        date_added: vuln.dateAdded,
        due_date: vuln.dueDate,
        ransomware_use: vuln.knownRansomwareCampaignUse,
      },
    },
  };
};

export const kevAdapter: FetchAdapter = {
  adapterType: 'kev',

  async run(source: SourceHit, context: AdapterRunContext): Promise<NormalizedReport[]> {
    const { logger, abortSignal, now } = context;
    const log = logger.get('kev-adapter');
    const fetchUrl = fetchUrlForContext(context);

    const feedUrl = readFeedUrl(source);
    const provenanceUrl = normalizeProvenanceUrl(feedUrl);
    const ingestedAt = now().toISOString();
    const spaceId = source._source.space_id ?? '*';

    const response = await fetchUrl(feedUrl, {
      abortSignal,
      headers: { 'User-Agent': BROWSER_USER_AGENT },
    });

    if (response.status >= 400) {
      throw new Error(
        `KEV feed returned HTTP ${response.status} ${response.statusText} from ${redactUrl(
          feedUrl
        )}`
      );
    }

    let envelope: KevEnvelope;
    try {
      envelope = JSON.parse(response.body) as KevEnvelope;
    } catch (err) {
      throw new Error(`KEV feed response is not valid JSON: ${(err as Error).message}`);
    }

    const vulnerabilities = envelope.vulnerabilities;
    if (!Array.isArray(vulnerabilities)) {
      throw new Error(
        `KEV feed missing vulnerabilities array (catalogVersion=${envelope.catalogVersion})`
      );
    }

    const reports: NormalizedReport[] = [];
    for (const vuln of vulnerabilities) {
      if (isCompleteKevEntry(vuln)) {
        reports.push(buildKevReport(vuln, provenanceUrl, ingestedAt, spaceId, source._id));
      } else {
        log.warn(
          `kev-adapter: skipping malformed entry (missing required fields): ${JSON.stringify(
            vuln
          ).slice(0, 200)}`
        );
      }
    }

    log.info(
      `kev-adapter: ${redactUrl(feedUrl)} → ${reports.length} reports (catalogVersion=${
        envelope.catalogVersion
      })`
    );

    return reports;
  },
};
