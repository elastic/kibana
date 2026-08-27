/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const THREAT_REPORTS_INDEX = '.kibana-threat-reports' as const;
/** Wildcard omits dash so `.kibana-threat-reports` matches (not only suffixed indices). */
export const THREAT_REPORTS_INDEX_PATTERN = '.kibana-threat-reports*' as const;
export const THREAT_INTEL_SOURCES_INDEX = '.kibana-threat-intel-sources' as const;
export const THREAT_INTEL_INDICATORS_INDEX = '.kibana-threat-intel-indicators' as const;
export const INDICATOR_REFERENCE_PREFIX = 'threat-report:' as const;

export const THREAT_INTEL_API_BASE = '/internal/threat_intel' as const;

export const CREATE_THREAT_REPORT_API_PATH =
  `${THREAT_INTEL_API_BASE}/create_threat_report` as const;
export const EXTRACT_IOCS_API_PATH = `${THREAT_INTEL_API_BASE}/extract_iocs` as const;
export const EXTRACT_DIAMOND_API_PATH = `${THREAT_INTEL_API_BASE}/extract_diamond` as const;
export const ASSESS_RELEVANCE_API_PATH = `${THREAT_INTEL_API_BASE}/assess_relevance` as const;
export const ENRICH_TAXONOMY_API_PATH = `${THREAT_INTEL_API_BASE}/enrich_taxonomy` as const;
export const CLASSIFY_SEVERITY_API_PATH = `${THREAT_INTEL_API_BASE}/classify_severity` as const;
export const LIST_SOURCES_API_PATH = `${THREAT_INTEL_API_BASE}/sources/list` as const;
export const CREATE_SOURCE_API_PATH = `${THREAT_INTEL_API_BASE}/sources` as const;
export const SOURCE_BY_ID_API_PATH = `${THREAT_INTEL_API_BASE}/sources/{sourceId}` as const;

/**
 * Text-embedding endpoint backing the `semantic_text` Diamond summary fields in
 * the reports mapping. This is not the model that performs Diamond extraction —
 * that one is resolved per request through
 * `THREAT_INTEL_DIAMOND_INFERENCE_FEATURE_ID`.
 */
export const DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID = '.jina-embeddings-v5-text-small' as const;

/**
 * Inference feature registry ids. Operators pick the model for each of these in
 * Stack Management > Model Settings; the enrich routes resolve through them
 * instead of naming an endpoint themselves.
 */
export const THREAT_INTEL_ENRICH_INFERENCE_FEATURE_ID = 'threat_intel_enrich' as const;
export const THREAT_INTEL_DIAMOND_INFERENCE_FEATURE_ID = 'threat_intel_diamond' as const;

/** Visible from every space (seed catalog). */
export const GLOBAL_SPACE_ID = '*' as const;

/**
 * Upper bound for user-supplied URLs on HTTP routes. `schema.uri()` validates
 * format but carries no length bound, so without this a URL could grow to the
 * body cap. Enforced via `validate` since `URIOptions` has no `maxLength`.
 */
export const MAX_URL_LENGTH = 2048;

export const SOURCE_TYPES = [
  'rss',
  'stix',
  'taxii',
  'vendor_api',
  'text_indicator_list',
  'kev',
  'email',
  'manual',
  'telemetry',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const IOC_TYPES = ['hash', 'ip', 'domain', 'url', 'email', 'cidr', 'wallet'] as const;
export type IocType = (typeof IOC_TYPES)[number];

export const THREAT_CATEGORIES = [
  'ransomware',
  'phishing',
  'malware',
  'data-breach',
  'vulnerability',
  'nation-state',
  'supply-chain',
  'insider-threat',
  'financial',
  'regulatory',
  'cloud-security',
  'iot-ot',
  'zero-day',
  'apt',
  'general',
  'cloud',
  'cybercrime',
  'iot',
  'ot-ics',
  'government-policy',
  'privacy-compliance',
  'research-tools',
] as const;
export type ThreatCategory = (typeof THREAT_CATEGORIES)[number];

export const THREAT_REGIONS = [
  'north-america',
  'south-america',
  'europe',
  'middle-east',
  'africa',
  'south-asia',
  'east-asia',
  'southeast-asia',
  'oceania',
  'global',
] as const;
export type ThreatRegion = (typeof THREAT_REGIONS)[number];
