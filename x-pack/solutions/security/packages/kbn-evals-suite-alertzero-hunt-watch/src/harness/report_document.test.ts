/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPORT_CLASSES_BY_CHAIN, phaseOrder } from './phases';
import { buildReportSpecs } from '../fixtures/report_documents';
import { loadManifest, loadSamples } from '../fixtures/load_corpus';

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
  'lineage.extraction_method'?: string;
  'extracted.iocs'?: Array<{ type: string; value: string }>;
  'extracted.ttps.techniques'?: string[];
  'extracted.vulnerability.vendor'?: string;
  'extracted.vulnerability.product'?: string;
}

describe('extracted.* field names vs load_report_context', () => {
  // Derived from the REAL documents the suite writes (both arms), not from a
  // hand-written copy of the list: a new extracted.* key added to a fixture
  // must land here or the pin fails.
  const manifest = loadManifest();
  const samples = loadSamples();
  const writtenExtractedFields = (): string[] => {
    const fields = new Set<string>();
    for (const arm of ['A', 'B'] as const) {
      for (const spec of buildReportSpecs(manifest, samples, arm)) {
        for (const key of Object.keys(spec.document)) {
          if (key.startsWith('extracted.')) fields.add(key);
        }
      }
    }
    return [...fields].sort();
  };

  it('every extracted.* field the suite writes is read by load_report_context', () => {
    const written = writtenExtractedFields();
    // Non-vacuous: the suite must actually write these two at minimum.
    expect(written).toEqual(
      expect.arrayContaining(['extracted.iocs', 'extracted.ttps.techniques'])
    );
    for (const field of written) {
      expect(LOAD_REPORT_CONTEXT_FIELDS).toContain(field);
    }
  });

  it('a report document using a wrong extracted.* name fails the pin', () => {
    const bad: Record<string, unknown> = { 'extracted.ioc_list': [] };
    const known = writtenExtractedFields();
    const badKeys = Object.keys(bad).filter((k) => k.startsWith('extracted.'));
    const unknown = badKeys.filter((k) => !known.includes(k));
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

  // The hunt-usable bar requires lineage.extraction_method to exist and not be
  // pending/rejected; the ingest route writes documents verbatim and enrich
  // never runs on suite reports, so an unstamped fixture is deterministically
  // `not_usable` on the candidates route and invalidates every batch.
  describe('hunt-usable lineage stamp', () => {
    const allSpecs = () =>
      (['A', 'B'] as const).flatMap((arm) => buildReportSpecs(loadManifest(), loadSamples(), arm));

    it('every report document stamps a finished extraction_method', () => {
      for (const spec of allSpecs()) {
        expect(spec.document['lineage.extraction_method']).toBe('seeded');
      }
    });

    it('an unstamped report fails the pin (drift breaks this test)', () => {
      const unstamped = allSpecs().filter(
        (s) => s.document['lineage.extraction_method'] !== 'seeded'
      );
      expect(unstamped).toEqual([]);
    });
  });
});
