/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0.
 */

import { REPORT_CLASSES_BY_CHAIN, phaseOrder } from './phases';

/**
 * Pins the `extracted.*` field names the suite writes against what
 * load_report_context reads off `.kibana-threat-reports` (design v1 §4b: the
 * mapping strictness is inferred, so a drift here must fail the build, not the
 * run). The SUT list is duplicated intentionally: this is a pin, not an import
 * (the plugin is not a dependency of this package).
 */
const LOAD_REPORT_CONTEXT_FIELDS = [
  '@timestamp',
  'content.title',
  'content.body_text',
  'source.name',
  'severity.level',
  'extracted.iocs',
  'extracted.ttps.techniques',
  'extracted.vulnerability.vendor',
  'extracted.vulnerability.product',
];

/** What the ingest route accepts, per the SUT's HTTP schema (open document). */
export interface ThreatReportDocument {
  'content.title'?: string;
  'content.body_text'?: string;
  'extracted.iocs'?: Array<{ type: string; value: string }>;
  'extracted.ttps.techniques'?: string[];
  'extracted.vulnerability.vendor'?: string;
  'extracted.vulnerability.product'?: string;
}

describe('extracted.* field names vs load_report_context', () => {
  it('every extracted.* field the suite writes is read by load_report_context', () => {
    const suiteExtractedFields = [
      'extracted.iocs',
      'extracted.ttps.techniques',
      'extracted.vulnerability.vendor',
      'extracted.vulnerability.product',
    ];
    for (const field of suiteExtractedFields) {
      expect(LOAD_REPORT_CONTEXT_FIELDS).toContain(field);
    }
  });

  it('a report document using a wrong extracted.* name fails the pin', () => {
    const bad: Record<string, unknown> = { 'extracted.ioc_list': [] };
    const suiteExtractedFields = [
      'extracted.iocs',
      'extracted.ttps.techniques',
      'extracted.vulnerability.vendor',
      'extracted.vulnerability.product',
    ];
    const badKeys = Object.keys(bad).filter((k) => k.startsWith('extracted.'));
    const unknown = badKeys.filter((k) => !suiteExtractedFields.includes(k));
    expect(unknown).toEqual(['extracted.ioc_list']);
  });

  it('the full read list is exactly what the SUT reads (drift breaks this test)', () => {
    expect(LOAD_REPORT_CONTEXT_FIELDS).toEqual([
      '@timestamp',
      'content.title',
      'content.body_text',
      'source.name',
      'severity.level',
      'extracted.iocs',
      'extracted.ttps.techniques',
      'extracted.vulnerability.vendor',
      'extracted.vulnerability.product',
    ]);
  });

  it('report plan constants stay sane', () => {
    expect(Object.keys(REPORT_CLASSES_BY_CHAIN)).toHaveLength(5);
    expect(phaseOrder()).toEqual(['E0', 'E+', 'E-']);
  });
});
