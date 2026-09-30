/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Success-path contract coverage for every TI supply response schema registered
 * on a route. Response validation only runs in `env.mode.dev`, so these tests
 * are what CI uses to catch drift between service output and the schema.
 */

import {
  assessRelevanceResponseSchema,
  classifySeverityResponseSchema,
  createThreatReportResponseSchema,
  enrichTaxonomyResponseSchema,
  extractDiamondResponseSchema,
  extractIocsResponseSchema,
  findThreatReportsResponseSchema,
  getThreatReportResponseSchema,
  listSourcesResponseSchema,
  readinessResponseSchema,
  updateSourceResponseSchema,
} from '.';

const assessRelevancePayload = {
  is_intelligence: true,
  quality_class: 'intel',
  evidence_tier: 'primary',
  needs_render: false,
  primary_links: ['https://vendor.test/report'],
  has_original_commentary: true,
  reason: 'Original Volt Typhoon IR with IOCs and TTPs.',
};

const extractIocsPayload = {
  count: 1,
  iocs: [
    {
      type: 'domain',
      value: 'evil.example',
      tier: 'discriminating',
      tier_heuristic: 'discriminating',
      tier_basis: 'defanged_source',
    },
  ],
  ioc_set_hash: 'abc123',
};

const extractDiamondPayload = {
  adversary: { signal: 'HIGH', summary: 'FIN7 operators' },
  capability: { signal: 'NONE', summary: '' },
  infrastructure: { signal: 'NONE', summary: '' },
  victim: { signal: 'PARTIAL', summary: 'retail POS environments' },
  signal_count: 2,
  model_id: 'test-connector',
  extracted_at: '2026-09-18T00:00:00.000Z',
  extraction_mode: 'single_call',
  report_id: 'default:abc',
};

const enrichTaxonomyPayload = {
  categories: ['ransomware'],
  regions: ['europe'],
  relevance: 0.75,
  diamond_suitable: true,
};

const classifySeverityPayload = {
  level: 'critical',
  score: 90,
  rationale: 'Active ransomware campaign with confirmed victims.',
};

const createThreatReportPayload = {
  status: 'ingested',
  content_fingerprint: 'deadbeef',
  report_id: 'default:abc',
  message: 'Report ingested. enrich_threat_report will pick it up on the next workflow run.',
};

const findThreatReportsPayload = {
  items: [
    {
      reportId: 'r1',
      title: 'Report',
      bodyText: 'Body text with indicators',
      severity: { level: 'high', score: 0.8 },
      iocs: [{ type: 'domain', value: 'evil.com' }],
      diamond: { signalCount: 3, suitable: true },
    },
  ],
  nextCursor: null,
};

const getThreatReportPayload = {
  reportId: 'default:abc',
  space_id: 'default',
  content: { title: 'Title', body_text: 'Body' },
  severity: { level: 'medium', score: 0.5 },
};

const readinessPayload = {
  status: 'ready',
  reasonCodes: [],
  lastIngestAt: '2026-09-18T00:00:00.000Z',
  lastEnrichAt: null,
  usableReportCount: 7,
};

const listSourcesPayload = {
  total: 1,
  sources: [
    {
      source_id: 'vendor_api:elastic-security-labs',
      name: 'Elastic Security Labs',
      adapter_type: 'vendor_api',
      enabled: true,
      url: 'https://www.elastic.co/security-labs/rss/feed.xml',
      tags: ['vendor', 'elastic'],
      report_count: 3,
      last_ingested_at: '2026-09-18T00:00:00.000Z',
      env_hits_total: 12,
    },
  ],
};

const updateSourcePayload = {
  source_id: 'vendor_api:elastic-security-labs',
  updated: true as const,
};

describe('threat intel response schemas', () => {
  it('returns the validated assess_relevance success payload', () => {
    expect(assessRelevanceResponseSchema.validate(assessRelevancePayload)).toEqual(
      assessRelevancePayload
    );
  });

  it('returns the validated extract_iocs success payload', () => {
    expect(extractIocsResponseSchema.validate(extractIocsPayload)).toEqual(extractIocsPayload);
  });

  it('returns the validated extract_diamond success payload', () => {
    expect(extractDiamondResponseSchema.validate(extractDiamondPayload)).toEqual(
      extractDiamondPayload
    );
  });

  it('returns the validated enrich_taxonomy success payload', () => {
    expect(enrichTaxonomyResponseSchema.validate(enrichTaxonomyPayload)).toEqual(
      enrichTaxonomyPayload
    );
  });

  it('returns the validated classify_severity success payload', () => {
    expect(classifySeverityResponseSchema.validate(classifySeverityPayload)).toEqual(
      classifySeverityPayload
    );
  });

  it('returns the validated create_threat_report success payload', () => {
    expect(createThreatReportResponseSchema.validate(createThreatReportPayload)).toEqual(
      createThreatReportPayload
    );
  });

  it('returns the validated find_threat_reports success payload', () => {
    expect(findThreatReportsResponseSchema.validate(findThreatReportsPayload)).toEqual(
      findThreatReportsPayload
    );
  });

  it('returns the validated get_threat_report success payload', () => {
    expect(getThreatReportResponseSchema.validate(getThreatReportPayload)).toEqual(
      getThreatReportPayload
    );
  });

  it('returns the validated readiness success payload', () => {
    expect(readinessResponseSchema.validate(readinessPayload)).toEqual(readinessPayload);
  });

  it('returns the validated list_sources success payload', () => {
    expect(listSourcesResponseSchema.validate(listSourcesPayload)).toEqual(listSourcesPayload);
  });

  it('returns the validated update_source success payload', () => {
    expect(updateSourceResponseSchema.validate(updateSourcePayload)).toEqual(updateSourcePayload);
  });
});
